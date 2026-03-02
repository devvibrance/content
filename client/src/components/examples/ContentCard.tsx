import { ContentCard } from "../ContentCard";

export default function ContentCardExample() {
  return (
    <div className="grid gap-4 p-6 max-w-md">
      <ContentCard
        platform="Twitter"
        content="Just shipped a new feature! Check out our latest update on building with brutal simplicity. 🚀"
        scheduledTime="Today, 2:00 PM"
        status="scheduled"
      />
      <ContentCard
        platform="LinkedIn"
        content="How we built a content system that scales creativity without complexity. A thread on our design philosophy."
        status="draft"
      />
    </div>
  );
}
