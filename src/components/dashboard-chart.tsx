type DashboardChartProps = {
  items: Array<{
    label: string;
    value: number;
  }>;
};

export function DashboardChart({ items }: DashboardChartProps) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-sm" key={item.label}>
          <span className="text-muted-foreground">{item.label}</span>
          <div className="h-3 overflow-hidden rounded-sm bg-muted">
            <div className="h-full rounded-sm bg-primary" style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%` }} />
          </div>
          <span className="text-right font-semibold">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
