import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Mic, Video, Twitter, Instagram, X, Sparkles, RectangleVertical } from "lucide-react";
import { EmbeddedTweet } from "./EmbeddedTweet";
import { EmbeddedInstagram } from "./EmbeddedInstagram";
import { useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface DraggableSeedProps {
  id: string;
  type: "text" | "image" | "audio" | "video" | "tweet" | "instagram" | "reel";
  content: string;
  mediaUrls?: string[];
  embedData?: {
    url: string;
    embedId: string;
    embedType: "tweet" | "instagram" | "reel";
  };
  metadata?: any;
  onDragStart?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}

const typeIcons = {
  text: FileText,
  image: Image,
  audio: Mic,
  video: Video,
  tweet: Twitter,
  instagram: Instagram,
  reel: RectangleVertical,
};

const typeLabels = {
  text: "Text",
  image: "Image",
  audio: "Audio",
  video: "Video",
  tweet: "X",
  instagram: "Post",
  reel: "Reel",
};

export const DraggableSeed = memo(function DraggableSeed({
  id, type, content, mediaUrls, embedData, metadata, onDragStart, onDelete
}: DraggableSeedProps) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const Icon = typeIcons[type];

  const handleLoadToSimulator = () => {
    sessionStorage.setItem("loadToSimulator", JSON.stringify({
      type: "library",
      data: {
        contentType: type,
        content: content,
        mediaUrls: mediaUrls,
      },
    }));
    navigate("/simulator");
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("seedId", id);
    e.dataTransfer.setData("seedContent", content);
    onDragStart?.(id, content);
  };

  if (embedData && (type === "tweet" || type === "instagram" || type === "reel")) {
    return (
      <div
        draggable
        onDragStart={handleDragStart}
        className="cursor-grab active:cursor-grabbing relative inline-block w-full"
        style={{ willChange: 'transform' }}
        data-testid={`draggable-seed-${id}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative w-full">
          <div
            className={cn(
              "absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-xl rounded-full px-1.5 py-1 transition-opacity z-50",
              hovered ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <button
              className="rounded-full bg-transparent text-white hover:text-red-400 p-0.5 transition"
              style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Remove"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(id);
              }}
              data-testid={`button-delete-${id}`}
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
          {embedData.embedType === "tweet" && (
            <EmbeddedTweet url={embedData.url} embedId={embedData.embedId} />
          )}
          {(embedData.embedType === "instagram" || embedData.embedType === "reel") && (
            <EmbeddedInstagram url={embedData.url} embedId={embedData.embedId} />
          )}
        </div>
      </div>
    );
  }


  return (
    <Card 
      draggable
      onDragStart={handleDragStart}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hover-elevate active-elevate-2 cursor-grab active:cursor-grabbing transition-transform duration-150 hover:scale-[1.02] relative bg-background/40 backdrop-blur-xl border-border/50 rounded-[8px] overflow-visible"
      data-testid={`draggable-seed-${id}`}
      style={{ willChange: 'transform' }}
    >
      <div
        className={cn(
          "absolute top-2 right-2 flex items-center gap-2.5 bg-black/70 backdrop-blur-md rounded-full px-2 py-1 transition-opacity z-50",
          hovered ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        {type === "text" && (
          <button
            className="rounded-full bg-transparent text-white hover:text-blue-400 p-0.5 transition"
            style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
            title="Edit"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleLoadToSimulator();
            }}
            data-testid={`button-load-${id}`}
          >
            <Sparkles className="w-3.5 h-3.5" fill="currentColor" />
          </button>
        )}
        <button
          className="rounded-full bg-transparent text-white hover:text-red-400 p-0.5 transition"
          style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Remove"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDelete?.(id);
          }}
          data-testid={`button-delete-${id}`}
        >
          <X className="w-3.5 h-3.5" strokeWidth={2.5} />
        </button>
      </div>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Icon className="w-5 h-5 text-muted-foreground" />
          <Badge variant="secondary" className="text-xs bg-background/60 backdrop-blur-sm">
            {typeLabels[type]}
          </Badge>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap font-mono" data-testid="text-seed-content">
          {content}
        </p>
      </CardContent>
    </Card>
  );
});
