import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Send, Bookmark } from "lucide-react";

interface InstagramPreviewProps {
  content: string;
  username?: string;
  imageUrl?: string;
}

export function InstagramPreview({ content, username = "yourbrand", imageUrl }: InstagramPreviewProps) {
  return (
    <Card className="max-w-md overflow-hidden" data-testid="instagram-preview">
      <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center p-12 relative">
        {imageUrl ? (
          <img src={imageUrl} alt="Post" className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <div className="text-center text-white z-10">
            <p className="text-2xl font-bold leading-tight whitespace-pre-wrap" data-testid="text-ig-content">
              {content}
            </p>
          </div>
        )}
      </div>
      
      <div className="p-4 space-y-3 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart className="w-6 h-6" />
            <MessageCircle className="w-6 h-6" />
            <Send className="w-6 h-6" />
          </div>
          <Bookmark className="w-6 h-6" />
        </div>
        
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-semibold">{username}</span>{" "}
            <span className="text-muted-foreground line-clamp-2">{content}</span>
          </p>
        </div>
      </div>
    </Card>
  );
}
