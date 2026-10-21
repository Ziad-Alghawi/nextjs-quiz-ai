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
    { label: "Current streak", value: currentStreak, unit: currentStreak === 1 ? "day" : "days" },
    { label: "Longest streak", value: longestStreak, unit: longestStreak === 1 ? "day" : "days" },
    {
      label: "This month",
      value: attemptsThisMonth,
      unit: attemptsThisMonth === 1 ? "attempt" : "attempts",
    },
  ];

  return (
    // A container query, because the room left next to the heatmap depends on the screen and the sidebar.
    <div className="@container flex min-w-0 flex-1 flex-col justify-center border-t pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      <dl className="grid gap-3 @xl:grid-cols-3 @xl:gap-4">
        {stats.map(({ label, value, unit }) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 @xl:block @xl:rounded-lg @xl:border @xl:p-4"
          >
            <dt className="text-sm whitespace-nowrap text-muted-foreground">{label}</dt>
            <dd className="text-xl font-semibold whitespace-nowrap @xl:mt-1 @xl:text-2xl">
              {value} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
