import { Check, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { DEFAULT_QUESTION_COUNT, EXAM_QUESTION_COUNTS, MAX_PDF_MB, PLANS } from "@/lib/plans";
import { cn, formatOrList } from "@/lib/utils";

function Box({
  className,
  title,
  text,
  children,
}: {
  className: string;
  title: string;
  text: string;
  children: ReactNode;
}) {
  return (
    <li className={cn("flex flex-col gap-5 rounded-3xl p-6", className)}>
      {children}
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{text}</p>
      </div>
    </li>
  );
}

const chapters = [
  { name: "01 Cell structure.pdf", pages: 18 },
  { name: "02 Photosynthesis.pdf", pages: 14 },
];

const scoreBars = [40, 55, 50, 70, 80];

const EXAM_LENGTH = 20;
const EXAM_ANSWERED = 6;

/**
 * The steps from upload to exam, drawn as small pictures of the app with sample content. Purely
 * decorative markup, so it stays static instead of reusing the interactive components.
 */
export function FeatureBoxes() {
  return (
    <ul id="how" className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      <Box
        className="bg-primary/8 lg:col-span-2"
        title="1 · Upload chapters"
        text={`PDFs up to ${MAX_PDF_MB} MB, sorted by course.`}
      >
        <div aria-hidden className="flex flex-col gap-2 text-sm">
          {chapters.map((chapter) => (
            <div
              key={chapter.name}
              className="flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5"
            >
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="flex-1 truncate">{chapter.name}</span>
              <span className="text-muted-foreground">{chapter.pages} p.</span>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-xl bg-card px-3 py-2.5">
            <span className="flex items-center gap-2.5">
              <FileText className="size-4 shrink-0 text-primary" />
              <span className="truncate">03 Cellular respiration.pdf</span>
            </span>
            <span className="h-1 overflow-hidden rounded-full bg-primary/15">
              <span className="block h-full w-2/3 bg-primary" />
            </span>
          </div>
        </div>
      </Box>

      <Box
        className="bg-violet/8 lg:col-span-2"
        title="2 · Generate a quiz"
        text="Four options and an explanation each."
      >
        <div aria-hidden className="flex flex-col gap-3 rounded-2xl bg-card p-4 text-sm">
          <p className="text-muted-foreground">Number of questions</p>
          <div className="flex gap-2">
            {PLANS.free.questionCounts.map((count) => (
              <span
                key={count}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-center font-medium",
                  count === DEFAULT_QUESTION_COUNT &&
                    "border-2 border-violet bg-violet/10 font-semibold text-violet",
                )}
              >
                {count}
              </span>
            ))}
          </div>
          <span className="rounded-lg bg-violet py-2.5 text-center font-semibold text-primary-foreground">
            Generate quiz
          </span>
        </div>
      </Box>

      <li className="flex flex-col justify-between gap-5 rounded-3xl bg-primary p-6 text-primary-foreground md:col-span-2 lg:col-span-2">
        <h3 className="text-sm font-semibold tracking-wider uppercase opacity-75">Average score</h3>
        <p className="text-7xl leading-none font-bold tracking-tighter">75%</p>
        <div aria-hidden className="flex h-12 items-end gap-1.5">
          {scoreBars.map((height, i) => (
            <span
              key={height}
              className={cn(
                "flex-1 rounded bg-primary-foreground",
                i < scoreBars.length - 1 && "opacity-35",
              )}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <p className="opacity-85">57 attempts saved</p>
      </li>

      <Box
        className="bg-success/8 lg:col-span-3"
        title="3 · Practise"
        text="See the right answer and why, after every question."
      >
        <div aria-hidden className="flex flex-col gap-2.5 rounded-2xl bg-card p-4 text-sm">
          <p className="text-base font-semibold">What does the Calvin cycle produce?</p>
          <div className="flex items-center gap-2.5 rounded-lg border-2 border-success bg-success/10 px-3 py-2.5">
            <span className="flex size-5.5 shrink-0 items-center justify-center rounded-md bg-success text-primary-foreground">
              <Check className="size-3" strokeWidth={3} />
            </span>
            Sugars made by fixing carbon dioxide
          </div>
          <p className="text-muted-foreground">
            <span className="font-semibold text-success">Correct! </span>It turns CO₂ into sugars
            that build glucose.
          </p>
        </div>
      </Box>

      <Box
        className="bg-amber/10 lg:col-span-3"
        title="4 · Take the course exam"
        text={`${formatOrList(EXAM_QUESTION_COUNTS)} questions, no hints until you finish.`}
      >
        <div aria-hidden className="flex flex-col gap-3 rounded-2xl bg-card p-4 text-sm">
          <div className="flex justify-between gap-3 text-muted-foreground">
            <span className="font-semibold text-foreground">Exam: Cell Biology</span>
            <span>
              {EXAM_ANSWERED} of {EXAM_LENGTH} answered
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: EXAM_LENGTH }, (_, i) => (
              <span
                key={i}
                className={cn(
                  "rounded-md border py-1.5 text-center text-xs font-semibold",
                  i < EXAM_ANSWERED && "border-amber bg-amber/20",
                )}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </Box>
    </ul>
  );
}
