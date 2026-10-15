const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Three figures next to the heatmap: rows under it on phones, a column beside it on large screens. */
export function ActivityStats({
  currentStreak,
  longestStreak,
  quizzesThisMonth,
}: {
  currentStreak: number;
  longestStreak: number;
  quizzesThisMonth: number;
}) {
  const stats = [
    { label: "Current streak", value: count(currentStreak, "day", "days") },
    { label: "Longest streak", value: count(longestStreak, "day", "days") },
    { label: "This month", value: count(quizzesThisMonth, "quiz", "quizzes") },
  ];

  return (
    <dl className="flex flex-col gap-3 border-t pt-4 lg:justify-center lg:gap-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
      {stats.map(({ label, value }) => (
        <div key={label} className="flex items-baseline justify-between gap-4 lg:block">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="text-xl font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
