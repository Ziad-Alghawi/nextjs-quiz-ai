import { pluralize } from "@/lib/pluralize";

/**
 * Three figures next to the heatmap: rows under it on phones, a column beside it on large screens,
 * and tiles when the room beside it allows.
 */
export function ActivityStats({
  currentStreak,
  longestStreak,
  attemptsThisMonth,
}: {
  currentStreak: number;
  longestStreak: number;
  attemptsThisMonth: number;
}) {
  const stats = [
    { label: "Current streak", value: pluralize(currentStreak, "day") },
    { label: "Longest streak", value: pluralize(longestStreak, "day") },
    { label: "This month", value: pluralize(attemptsThisMonth, "attempt") },
  ];

  return (
    // A container query, because the room left next to the heatmap depends on the screen and the sidebar.
    <div className="@container flex min-w-0 flex-1 flex-col justify-center border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <dl className="grid gap-3 @xl:grid-cols-3 @xl:gap-4">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 @xl:block @xl:rounded-lg @xl:border @xl:p-4"
          >
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold @xl:mt-1 @xl:text-2xl">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
