import { ProjectCard } from "../ProjectCard";

export default function ProjectCardExample() {
  return (
    <div className="grid gap-4 p-6 max-w-md">
      <ProjectCard
        id="1"
        name="Minimal Design Agency"
        description="A speculative branding project for a boutique design studio focused on timeless aesthetics"
        status="live"
        onView={() => console.log("View project")}
      />
      <ProjectCard
        id="2"
        name="SaaS Product Launch"
        description="Complete campaign strategy for a B2B software product targeting creative professionals"
        status="draft"
        onView={() => console.log("View project")}
      />
    </div>
  );
}
