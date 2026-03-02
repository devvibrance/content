import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Image, Mic, Video } from "lucide-react";

interface SeedCardProps {
  id: string;
  type: "text" | "image" | "audio" | "video";
  content: string;
  tags?: string[];
  thumbnail?: string;
}

export function SeedCard({ id, type, content, tags = [], thumbnail }: SeedCardProps) {
  const typeIcons = {
    text: FileText,
    image: Image,
    audio: Mic,
    video: Video,
  };

  const Icon = typeIcons[type];

  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer aspect-square" 
      data-testid={`card-seed-${id}`}
    >
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <Icon className="w-5 h-5 text-muted-foreground" data-testid={`icon-seed-type-${type}`} />
        </div>
        {thumbnail && type === "image" ? (
          <div className="flex-1 mb-3 rounded-md overflow-hidden bg-muted">
            <img src={thumbnail} alt="Seed thumbnail" className="w-full h-full object-cover" />
          </div>
        ) : (
          <p className="flex-1 text-sm line-clamp-4 mb-3" data-testid="text-seed-content">
            {content}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${tag}`}>
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
