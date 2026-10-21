"use client";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { pluralize } from "@/lib/pluralize";
import { DAY_MS } from "@/lib/time";
import { cn } from "@/lib/utils";

const WEEKS = 53;
// 10px squares with 2px gaps; narrower cards scroll the grid.
const CELL = "size-[10px] rounded-[2px]";
// Roughly half the widest tooltip; closer to an edge than this, the tooltip aligns inward.
const TOOLTIP_HALF_WIDTH = 90;
// Fewer to more attempts on a day; 4 or more get the full accent color.
const SHADES = ["bg-muted", "bg-primary/30", "bg-primary/55", "bg-primary/80", "bg-primary"];
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

// Days are UTC dates, like the database's created_at.
const dayFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });

type Day = { time: number; count: number } | null;

/** 53 columns of Sunday-to-Saturday days ending today; days after today are null. */
function buildWeeks(activity: { date: string; count: number }[], today: string): Day[][] {
  const counts = new Map(activity.map((day) => [day.date, day.count]));
  const todayTime = Date.parse(today);
  const firstSunday = todayTime - (new Date(todayTime).getUTCDay() + (WEEKS - 1) * 7) * DAY_MS;

  return Array.from({ length: WEEKS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const time = firstSunday + (week * 7 + weekday) * DAY_MS;
      if (time > todayTime) return null;
      return { time, count: counts.get(new Date(time).toISOString().slice(0, 10)) ?? 0 };
    }),
  );
}

const describe = (day: { time: number; count: number }) =>
  `${day.count === 0 ? "No attempts" : pluralize(day.count, "attempt")} on ${dayFormat.format(day.time)}`;

/**
 * The user's attempts per day over the last year. One cell at a time is focusable and the
 * arrow keys move between days (a roving tabindex), so keyboard users don't tab through 371 cells.
 */
export function ActivityHeatmap({
  activity,
  today,
}: {
  activity: { date: string; count: number }[];
  /** Today as YYYY-MM-DD, from the server, so server and browser render the same days. */
  today: string;
}) {
  const weeks = useMemo(() => buildWeeks(activity, today), [activity, today]);
  const [active, setActive] = useState({ week: WEEKS - 1, weekday: new Date(today).getUTCDay() });
  const [tooltip, setTooltip] = useState<{
    text: string;
    left: number;
    top: number;
    align: "start" | "center" | "end";
  } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // On narrow screens the grid scrolls; start at the most recent weeks.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  const showTooltip = (cell: HTMLElement, day: { time: number; count: number }) => {
    const container = scroller.current;
    if (!container) return;
    const box = container.getBoundingClientRect();
    const rect = cell.getBoundingClientRect();
    const center = rect.left - box.left + rect.width / 2;
    const align =
      center < TOOLTIP_HALF_WIDTH
        ? "start"
        : center > box.width - TOOLTIP_HALF_WIDTH
          ? "end"
          : "center";
    setTooltip({
      text: describe(day),
      left: center + container.scrollLeft,
      top: rect.top - box.top,
      align,
    });
  };

  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const week = Math.min(Math.max(active.week + move[0], 0), WEEKS - 1);
    const weekday = Math.min(Math.max(active.weekday + move[1], 0), 6);
    if (!weeks[week][weekday]) return;
    setActive({ week, weekday });
    scroller.current?.querySelector<HTMLElement>(`[data-cell="${week}-${weekday}"]`)?.focus();
  };

  return (
    // As wide as the grid, so the legend stays right under the cells.
    <div className="flex w-max min-w-0 max-w-full flex-col gap-2">
      <div ref={scroller} className="relative overflow-x-auto pb-1 pt-7">
        {tooltip ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute z-10 -translate-y-full whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background",
              { start: "", center: "-translate-x-1/2", end: "-translate-x-full" }[tooltip.align],
            )}
            style={{ left: tooltip.left, top: tooltip.top - 4 }}
          >
            {tooltip.text}
          </div>
        ) : null}
        <div
          role="grid"
          aria-label="Attempts per day in the last year"
          onKeyDown={moveFocus}
          className="grid w-max gap-[2px]"
          style={{ gridTemplateColumns: `2.5rem repeat(${WEEKS}, 10px)` }}
        >
          <div aria-hidden className="contents text-xs text-muted-foreground">
            <span className="sticky left-0 bg-card" />
            {weeks.map((week, index) => {
              const first = week[0];
              // A label where a month begins in this week, so a partial first month gets none.
              const startsMonth = first && new Date(first.time).getUTCDate() <= 7;
              return (
                <span key={index} className="h-4 overflow-visible whitespace-nowrap">
                  {startsMonth ? monthFormat.format(first.time) : ""}
                </span>
              );
            })}
          </div>
          {WEEKDAY_LABELS.map((label, weekday) => (
            <div key={weekday} role="row" className="contents">
              {/* Stays visible while the grid scrolls on narrow screens. The 10px line height keeps
                  a label from making its row taller than the cells, while the column still covers
                  the cells scrolling under it. */}
              <span
                aria-hidden
                className="sticky left-0 z-[1] self-center bg-card text-xs leading-[10px] text-muted-foreground"
              >
                {label}
              </span>
              {weeks.map((week, weekIndex) => {
                const day = week[weekday];
                if (!day) return <span key={weekIndex} />;
                const isActive = active.week === weekIndex && active.weekday === weekday;
                return (
                  <div
                    key={weekIndex}
                    role="gridcell"
                    data-cell={`${weekIndex}-${weekday}`}
                    tabIndex={isActive ? 0 : -1}
                    aria-label={describe(day)}
                    className={cn(
                      CELL,
                      "outline-offset-1 focus-visible:outline-2 focus-visible:outline-ring",
                      SHADES[Math.min(day.count, SHADES.length - 1)],
                    )}
                    onMouseEnter={(event) => showTooltip(event.currentTarget, day)}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={(event) => {
                      setActive({ week: weekIndex, weekday });
                      showTooltip(event.currentTarget, day);
                    }}
                    onBlur={() => setTooltip(null)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className="flex items-center justify-end gap-1 text-xs text-muted-foreground"
      >
        Less
        {SHADES.map((shade) => (
          <span key={shade} className={cn(CELL, shade)} />
        ))}
        More
      </div>
    </div>
  );
}
