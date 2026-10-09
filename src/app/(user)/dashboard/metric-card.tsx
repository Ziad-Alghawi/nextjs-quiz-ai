import { Card } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  unit = "",
}: {
  label: string;
  value: number | null;
  unit?: string;
}) {
  return (
    <Card className="gap-1 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold">{value === null ? "–" : `${value}${unit}`}</p>
    </Card>
  );
}
