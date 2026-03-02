import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [immersiveEnabled, setImmersiveEnabled] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState("");
  const [brightness, setBrightness] = useState(50);
  const [blur, setBlur] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("contentOS_settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.immersiveEnabled !== undefined) setImmersiveEnabled(settings.immersiveEnabled);
        if (settings.backgroundUrl) setBackgroundUrl(settings.backgroundUrl);
        if (settings.brightness !== undefined) setBrightness(settings.brightness);
        if (settings.blur !== undefined) setBlur(settings.blur);
      } catch (e) {
        console.error("Error loading settings");
      }
    }
  }, [open]);

  const saveSettings = (updates: Partial<{ 
    immersiveEnabled: boolean; 
    backgroundUrl: string; 
    brightness: number;
    blur: number;
  }>): boolean => {
    const newSettings = {
      immersiveEnabled: updates.immersiveEnabled ?? immersiveEnabled,
      backgroundUrl: updates.backgroundUrl ?? backgroundUrl,
      brightness: updates.brightness ?? brightness,
      blur: updates.blur ?? blur,
    };
    
    try {
      localStorage.setItem("contentOS_settings", JSON.stringify(newSettings));
      if (updates.immersiveEnabled !== undefined) setImmersiveEnabled(updates.immersiveEnabled);
      if (updates.backgroundUrl !== undefined) setBackgroundUrl(updates.backgroundUrl);
      if (updates.brightness !== undefined) setBrightness(updates.brightness);
      if (updates.blur !== undefined) setBlur(updates.blur);
      window.dispatchEvent(new Event("settingsUpdated"));
      return true;
    } catch (e) {
      if (e instanceof Error && e.name === "QuotaExceededError") {
        toast({
          title: "Image too large to save",
          description: "This image exceeds browser storage limits. Try a smaller file (under 2MB recommended)",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save failed",
          description: "Could not save settings",
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 10MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      
      // Check if the base64 data is too large for localStorage (rough check)
      if (result.length > 4 * 1024 * 1024) {
        toast({
          title: "File too large for storage",
          description: "GIF/image is too large. Please use a file under 2MB for best results.",
          variant: "destructive",
        });
        return;
      }
      
      const saved = saveSettings({ backgroundUrl: result, immersiveEnabled: true });
      if (saved) {
        toast({
          title: "Background set",
          description: "Your background image has been applied",
        });
      }
    };
    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Failed to read file",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };
  
  const isGifBackground = backgroundUrl?.toLowerCase().includes('image/gif');

  const removeBackground = () => {
    saveSettings({ backgroundUrl: "", immersiveEnabled: false });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0E0E0E]/95 border-0 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-white">Settings</DialogTitle>
          <DialogDescription className="text-white/60">
            Customize your ContentOS experience
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Immersive Background</h3>
              <p className="text-sm text-white/60">
                Add a custom background image or GIF for a more immersive experience.
              </p>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="immersive-toggle" className="text-base font-normal text-white">
                Enable immersive background
              </Label>
              <Switch
                id="immersive-toggle"
                checked={immersiveEnabled}
                onCheckedChange={(checked) => saveSettings({ immersiveEnabled: checked })}
                data-testid="switch-immersive"
              />
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-base font-medium text-white">Background Image/GIF</Label>
              <div className="flex gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-background-upload"
                />
                <Button
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[8px] h-8 px-3 bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5"
                  data-testid="button-upload"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span className="text-sm">Upload Image</span>
                </Button>
                {backgroundUrl && (
                  <Button
                    variant="ghost"
                    onClick={removeBackground}
                    className="rounded-[8px] h-8 px-3 bg-white/10 hover:bg-red-600/20 text-white hover:text-red-400 flex items-center gap-1.5"
                    data-testid="button-remove-background"
                  >
                    <span className="text-sm">Remove</span>
                  </Button>
                )}
              </div>
              <p className="text-xs text-white/40">
                Supports JPEG, PNG, GIF, WebP (max 10MB)
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium text-white">Background Brightness: {brightness}%</Label>
              </div>
              <Slider
                value={[brightness]}
                onValueChange={(value) => saveSettings({ brightness: value[0] })}
                max={100}
                step={1}
                data-testid="slider-brightness"
              />
              <p className="text-xs text-white/40">
                Lower values make the background darker for better text readability
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium text-white">Background Blur: {blur}px</Label>
              </div>
              <Slider
                value={[blur]}
                onValueChange={(value) => saveSettings({ blur: value[0] })}
                max={50}
                step={1}
                data-testid="slider-blur"
              />
              <p className="text-xs text-white/40">
                Add blur effect to the background image
              </p>
            </div>

            {backgroundUrl && (
              <div className="space-y-3 pt-4">
                <Label className="text-base font-medium text-white">Preview</Label>
                <div 
                  className="relative w-full h-48 rounded-[8px] overflow-hidden flex items-center justify-center"
                >
                  {isGifBackground ? (
                    <img
                      src={backgroundUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ filter: `blur(${blur}px)` }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${backgroundUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: `blur(${blur}px)`,
                      }}
                    />
                  )}
                  <div 
                    className="absolute inset-0 bg-black"
                    style={{ opacity: (100 - brightness) / 100 }}
                  />
                  <div className="relative z-10">
                    <p className="text-white text-xl font-medium">Sample Text</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
