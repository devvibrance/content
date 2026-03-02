import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DraggableSeed } from "@/components/DraggableSeed";
import { SavedSimulationCard } from "@/components/SavedSimulationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Twitter, Instagram, FileText, Loader2, ArrowRight, RectangleVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmbeddedTweet } from "@/components/EmbeddedTweet";
import { EmbeddedInstagram } from "@/components/EmbeddedInstagram";
import * as idb from "@/lib/indexedDB";
import { getActiveProfileId } from "@/lib/indexedDB";

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.7, ease: "easeInOut" } },
};

const fadeTransition = { duration: 0.7, ease: "easeInOut" };

type SeedType = "text" | "image" | "video" | "tweet" | "instagram" | "reel";
type FilterType = SeedType | "simulation" | "all";

const detectContentType = (input: string): { type: SeedType; isUrl: boolean } => {
  const trimmed = input.trim();
  
  // Check for Twitter/X URLs
  if (/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(trimmed)) {
    return { type: "tweet", isUrl: true };
  }
  
  // Check for Instagram Reel URLs
  if (/instagram\.com\/reel\/[A-Za-z0-9_-]+/.test(trimmed)) {
    return { type: "reel", isUrl: true };
  }
  
  // Check for Instagram Post URLs
  if (/instagram\.com\/p\/[A-Za-z0-9_-]+/.test(trimmed)) {
    return { type: "instagram", isUrl: true };
  }
  
  // Default to text
  return { type: "text", isUrl: false };
};

const isValidUrl = (input: string): boolean => {
  const { isUrl } = detectContentType(input);
  return isUrl;
};

const getTweetId = (url: string): string | null => {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  return match ? match[1] : null;
};

export default function Library() {
  const { toast } = useToast();
  const searchQuery = "";
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dropInput, setDropInput] = useState("");
  const [detectedType, setDetectedType] = useState<{ type: SeedType; isUrl: boolean }>({ type: "text", isUrl: false });
  const [showPreview, setShowPreview] = useState(true);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [libraryItems, setLibraryItems] = useState<(idb.LibraryItem & { mediaFiles: idb.MediaFile[] })[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<idb.SavedSimulation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProfilePic, setActiveProfilePic] = useState<string | null>(null);

  const loadLibraryItems = async () => {
    setIsLoading(true);
    try {
      const activeProfileId = await getActiveProfileId();
      if (activeProfileId) {
        const [items, simulations, activeProfile] = await Promise.all([
          idb.getLibraryItemsForProfile(activeProfileId),
          idb.getSavedSimulationsForProfile(activeProfileId),
          idb.getActiveProfile(),
        ]);
        setLibraryItems(items);
        setSavedSimulations(simulations);
        setActiveProfilePic(activeProfile?.profilePic || null);
      } else {
        // Fallback to all items if no active profile
        const [items, simulations] = await Promise.all([
          idb.getAllLibraryItems(),
          idb.getAllSavedSimulations()
        ]);
        setLibraryItems(items);
        setSavedSimulations(simulations);
      }
    } catch (error) {
      console.error("Failed to load library items:", error);
      toast({
        title: "Error loading library",
        description: "Failed to load library items from database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLibraryItems();

    const handleSimulationsUpdated = () => {
      loadLibraryItems();
    };

    const handleProfileChanged = () => {
      loadLibraryItems();
    };

    window.addEventListener("savedSimulationsUpdated", handleSimulationsUpdated);
    window.addEventListener("activeProfileChanged", handleProfileChanged);
    window.addEventListener("profileUpdated", handleProfileChanged);
    return () => {
      window.removeEventListener("savedSimulationsUpdated", handleSimulationsUpdated);
      window.removeEventListener("activeProfileChanged", handleProfileChanged);
      window.removeEventListener("profileUpdated", handleProfileChanged);
    };
  }, []);

  const handleInputChange = (value: string) => {
    setDropInput(value);
    const detected = detectContentType(value);
    setDetectedType(detected);
    setShowPreview(true);
  };

  const handleSaveToLibrary = async () => {
    const content = dropInput;
    if (!content.trim()) return;

    try {
      const { type, isUrl } = detectedType;

      const item = {
        type,
        content,
        ...(isUrl && { embedUrl: content }),
      };

      setShowPreview(false);
      setDropInput("");
      setDetectedType({ type: "text", isUrl: false });

      const saved = await idb.createLibraryItem(item);
      setJustSavedId(saved.id);
      await loadLibraryItems();

      setShowPreview(true);

      toast({
        title: "Added to library",
        description: content.trim() ? (type === "text" ? "Text saved" : `${type.charAt(0).toUpperCase() + type.slice(1)} added`) : "Empty item saved",
      });
    } catch (error) {
      console.error("Failed to save to library:", error);
      toast({
        title: "Save failed",
        description: "Failed to save content to library",
        variant: "destructive",
      });
    }
  };

  type LibraryGridItem = 
    | { kind: "seed"; data: idb.LibraryItem & { mediaFiles: idb.MediaFile[] } }
    | { kind: "simulation"; data: idb.SavedSimulation };

  const combinedItems = useMemo(() => {
    const items: LibraryGridItem[] = [];
    
    // Add filtered seeds
    if (filterType !== "simulation") {
      libraryItems.forEach(seed => {
        const content = seed.content || "";
        const matchesSearch = content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || seed.type === filterType;
        if (matchesSearch && matchesType) {
          items.push({ kind: "seed", data: seed });
        }
      });
    }
    
    // Add filtered simulations
    savedSimulations.forEach(sim => {
      const content = sim.text || "";
      const matchesSearch = content.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesType = false;
      if (filterType === "all" || filterType === "simulation") {
        matchesType = true;
      } else if (filterType === "tweet" && sim.platform === "twitter") {
        matchesType = true;
      } else if (filterType === "instagram" && sim.platform === "instagram") {
        matchesType = true;
      }
      
      if (matchesSearch && matchesType) {
        items.push({ kind: "simulation", data: sim });
      }
    });
    
    // Sort all by date, newest first
    return items.sort((a, b) => {
      const dateA = new Date(a.data.createdAt).getTime();
      const dateB = new Date(b.data.createdAt).getTime();
      return dateB - dateA;
    });
  }, [libraryItems, savedSimulations, searchQuery, filterType]);

  const handleDragStart = useCallback((id: string, content: string) => {
    toast({
      title: "Item grabbed",
      description: "Drag to Waterfall",
    });
  }, [toast]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      setLibraryItems(prev => prev.filter(item => item.id !== id));
      await idb.deleteLibraryItem(id);
      toast({
        title: "Item deleted",
        description: "Removed from your library",
      });
    } catch (error) {
      console.error("Failed to delete item:", error);
      await loadLibraryItems();
      toast({
        title: "Delete failed",
        description: "Failed to remove item from library",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleDeleteSimulation = useCallback(async (id: string) => {
    try {
      setSavedSimulations(prev => prev.filter(sim => sim.id !== id));
      await idb.deleteSavedSimulation(id);
      toast({
        title: "Simulation deleted",
        description: "Removed from your library",
      });
    } catch (error) {
      console.error("Failed to delete simulation:", error);
      await loadLibraryItems();
      toast({
        title: "Delete failed",
        description: "Failed to remove simulation from library",
        variant: "destructive",
      });
    }
  }, [toast]);

  return (
    <div className="min-h-screen p-8 md:p-12 lg:p-16 pb-40 animate-in fade-in duration-700 ease-in-out">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">Library</h1>
          <p className="text-base text-white/60">Manage your content library</p>
        </div>

        {/* Filter */}
        <div className="flex gap-4">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-48 h-12 bg-[#0E0E0E]/60 backdrop-blur-xl border-0 text-white" data-testid="select-filter-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-[#0E0E0E]/95 backdrop-blur-xl border-0 text-white">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="simulation">Saved</SelectItem>
              <SelectItem value="tweet">Tweets</SelectItem>
              <SelectItem value="instagram">Posts</SelectItem>
              <SelectItem value="reel">Reels</SelectItem>
              <SelectItem value="text">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Grid */}
        {isLoading ? (
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-white/40" />
              </div>
            ) : (
              <div>
                {(combinedItems.length > 0 || (dropInput.trim() && detectedType.isUrl)) ? (
                  <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5" style={{ columnFill: 'balance' }}>
                    <AnimatePresence mode="sync">
                      {/* Preview Card - always first in grid */}
                      {showPreview && dropInput.trim() && detectedType.isUrl && (
                        <motion.div
                          key="preview-card"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.35, ease: "easeOut" }}
                          className="break-inside-avoid mb-5"
                        >
                          <div className="relative">
                            {/* Preview Badge - pops in after post appears */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ 
                                type: "spring",
                                stiffness: 400,
                                damping: 20,
                                delay: 0.4
                              }}
                              className="absolute -top-2 -left-2 z-10 bg-primary text-white text-xs px-2 py-0.5 rounded-full"
                            >
                              Preview
                            </motion.div>
                            {detectedType.type === "tweet" && getTweetId(dropInput) && (
                              <EmbeddedTweet url={dropInput} embedId="drop-preview" />
                            )}
                            {(detectedType.type === "instagram" || detectedType.type === "reel") && (
                              <EmbeddedInstagram url={dropInput} embedId="drop-preview" />
                            )}
                          </div>
                        </motion.div>
                      )}
                      {/* Combined items sorted by date */}
                      {combinedItems.map((item) => {
                        const skipEntryAnimation = item.kind === "seed" && item.data.id === justSavedId;
                        return (
                        <motion.div
                          key={item.kind === "simulation" ? `sim-${item.data.id}` : `seed-${item.data.id}`}
                          initial={skipEntryAnimation ? false : { opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95, filter: "blur(6px)" }}
                          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                          className="break-inside-avoid mb-5"
                        >
                          {item.kind === "simulation" ? (
                            <SavedSimulationCard
                              simulation={item.data}
                              onDelete={handleDeleteSimulation}
                              currentProfilePic={activeProfilePic}
                            />
                          ) : (
                            <DraggableSeed
                              id={item.data.id}
                              type={item.data.type}
                              content={item.data.content || ""}
                              mediaUrls={item.data.mediaFiles?.map(m => m.fileData)}
                              embedData={item.data.embedUrl ? {
                                url: item.data.embedUrl,
                                embedId: item.data.metadata?.embedId || item.data.id,
                                embedType: item.data.type as "tweet" | "instagram" | "reel",
                              } : undefined}
                              metadata={item.data.metadata}
                              onDragStart={handleDragStart}
                              onDelete={handleDelete}
                            />
                          )}
                        </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-white/30 space-y-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <p className="text-sm">Your library is empty</p>
                  </div>
              )}
            </div>
          )}
      </div>

      {/* Sticky Bottom Input Bar - matches navbar styling */}
      <div className="fixed bottom-6 left-[calc(50%-200px)] -translate-x-1/2 z-50 bg-[#0E0E0E]/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Type Badge - left aligned inside the bar */}
          <AnimatePresence mode="wait">
            {dropInput.trim() && detectedType.isUrl && (
              <motion.div
                key={detectedType.type}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: -10 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs bg-white/10 text-white flex-shrink-0"
              >
                {detectedType.type === "tweet" && <><Twitter className="w-3.5 h-3.5" /> X/Twitter</>}
                {detectedType.type === "instagram" && <><Instagram className="w-3.5 h-3.5" /> Post</>}
                {detectedType.type === "reel" && <><RectangleVertical className="w-3.5 h-3.5" /> Reel</>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input */}
          <Input
            placeholder="Drop a Twitter, Instagram, or Reel link..."
            value={dropInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dropInput.trim()) {
                e.preventDefault();
                handleSaveToLibrary();
              }
            }}
            className="w-[400px] h-10 text-base bg-transparent border-transparent text-white/60 placeholder:text-white/30 focus:text-white focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
            data-testid="input-drop-content"
          />

          {/* Arrow */}
          <button
            onClick={handleSaveToLibrary}
            disabled={!dropInput.trim()}
            className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-0"
            data-testid="button-save-library"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
