import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import { calculateInstagramScore } from "@/utils/algorithmScoring";

interface InstagramCarouselPreviewProps {
  content: string;
  username?: string;
}

export function InstagramCarouselPreview({ content, username = "creator" }: InstagramCarouselPreviewProps) {
  const score = calculateInstagramScore(content);

  const getScoreColor = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-500";
    if (grade.startsWith("B")) return "bg-blue-500";
    if (grade.startsWith("C")) return "bg-yellow-500";
    if (grade.startsWith("D")) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4">
      <Card className="max-w-md bg-white dark:bg-zinc-900 border-0 overflow-hidden">
        <div className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-purple-400 to-orange-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-xs font-semibold">
                {username[0].toUpperCase()}
              </div>
            </div>
            <span className="font-semibold text-sm text-zinc-900 dark:text-white">{username}</span>
          </div>
          <MoreHorizontal className="w-5 h-5 text-zinc-900 dark:text-white" />
        </div>

        <div className="aspect-square bg-gradient-to-br from-pink-100 via-purple-100 to-orange-100 dark:from-pink-950 dark:via-purple-950 dark:to-orange-950 flex items-center justify-center p-8">
          <p className="text-center text-zinc-700 dark:text-zinc-300 text-sm font-medium">
            [Carousel Image]
          </p>
        </div>

        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Heart className="w-6 h-6 text-zinc-900 dark:text-white" />
              <MessageCircle className="w-6 h-6 text-zinc-900 dark:text-white" />
              <Send className="w-6 h-6 text-zinc-900 dark:text-white" />
            </div>
            <Bookmark className="w-6 h-6 text-zinc-900 dark:text-white" />
          </div>

          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            1,234 likes
          </p>

          <div className="text-sm text-zinc-900 dark:text-white">
            <span className="font-semibold mr-2">{username}</span>
            <span className="whitespace-pre-wrap">{content}</span>
          </div>

          <p className="text-xs text-zinc-500">View all 42 comments</p>
          <p className="text-xs text-zinc-400">2 hours ago</p>
        </div>
      </Card>

      <Card className="max-w-md p-4 bg-background border-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Algorithm Score</h3>
            <Badge className={`${getScoreColor(score.grade)} text-white`}>
              {score.grade} - {score.totalScore}/100
            </Badge>
          </div>

          <div className="space-y-1.5">
            {score.insights.map((insight, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                {insight}
              </p>
            ))}
          </div>

          <div className="pt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content Boosts:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                +{score.breakdown.contentBoosts}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Structure:</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                +{score.breakdown.structure}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Engagement:</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                +{score.breakdown.engagement}
              </span>
            </div>
            {score.breakdown.penalties < 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Penalties:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {score.breakdown.penalties}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
