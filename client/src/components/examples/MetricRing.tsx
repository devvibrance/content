import { MetricRing } from "../MetricRing";

export default function MetricRingExample() {
  return (
    <div className="flex gap-8 p-8">
      <MetricRing value={75} max={100} label="Newsletter" color="hsl(var(--chart-1))" />
      <MetricRing value={90} max={100} label="Posts" color="hsl(var(--chart-2))" />
      <MetricRing value={60} max={100} label="Campaigns" color="hsl(var(--chart-3))" />
    </div>
  );
}
