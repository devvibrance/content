interface MetricRingProps {
  value: number;
  max: number;
  label: string;
  color?: string;
}

export function MetricRing({ value, max, label, color = "hsl(var(--chart-1))" }: MetricRingProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 transition-transform duration-300 hover:scale-105" data-testid={`metric-ring-${label.toLowerCase().replace(' ', '-')}`}>
      <div className="relative">
        <svg width="140" height="140" className="transform -rotate-90 filter drop-shadow-sm">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-semibold" data-testid={`text-metric-value-${label.toLowerCase().replace(' ', '-')}`}>
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground" data-testid={`text-metric-label-${label.toLowerCase().replace(' ', '-')}`}>
        {label}
      </p>
    </div>
  );
}
