import { Badge } from "@/components/ui/badge";
import { FileEdit, Clock, CheckCircle2 } from "lucide-react";

interface ContentStatusBadgeProps {
  status: "draft" | "scheduled" | "published";
}

export function ContentStatusBadge({ status }: ContentStatusBadgeProps) {
  const statusConfig = {
    draft: {
      icon: FileEdit,
      label: "Draft",
      className: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    },
    scheduled: {
      icon: Clock,
      label: "Scheduled",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    },
    published: {
      icon: CheckCircle2,
      label: "Published",
      className: "bg-green-500/10 text-green-600 dark:text-green-400",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className={`gap-1 ${config.className}`} data-testid={`badge-status-${status}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  );
}
