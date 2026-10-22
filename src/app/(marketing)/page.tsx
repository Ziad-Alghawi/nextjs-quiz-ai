import { Check } from "lucide-react";
import { getImageProps } from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MAX_PDF_MB, PLANS } from "@/lib/plans";
import { cn, formatOrList } from "@/lib/utils";
import { getCurrentUser } from "@/server/session";
import { FeatureBoxes } from "./feature-boxes";

// Limits come from PLANS, the same config the server enforces.
const plans = [
  {
    id: "free",
    name: PLANS.free.label,
    summary: "To get started",
    intro: null,
    features: [
      `${PLANS.free.monthlyQuizzes} AI quizzes a month`,
      `${formatOrList(PLANS.free.questionCounts)} questions per quiz`,
      `${PLANS.free.maxChapters} chapters (PDFs up to ${MAX_PDF_MB} MB)`,
      "Explanation for every answer",
      "Review quizzes and course exams (don't use your quota)",
      "Practise your mistakes",
      "Saved attempts, stats and streaks",
    ],
  },
  {
    id: "pro",
    name: PLANS.pro.label,
    summary: "For regular studying",
    intro: "Everything in Free, plus:",
    features: [
      `${PLANS.pro.monthlyQuizzes} AI quizzes a month (${PLANS.pro.monthlyQuizzes / PLANS.free.monthlyQuizzes}× more)`,
      `Up to ${Math.max(...PLANS.pro.questionCounts)} questions per quiz`,
      `${PLANS.pro.maxChapters} chapters`,
    ],
  },
] as const;

const overviewAlt = "Overview with quiz stats, the activity heatmap and study streaks";

/** The overview screenshot in the visitor's color scheme; the browser downloads only one of them. */
function OverviewScreenshot() {
  const common = {
    alt: overviewAlt,
    width: 2560,
    height: 1280,
    sizes: "(min-width: 1152px) 1024px, 100vw",
  };
  const { props: dark } = getImageProps({ ...common, src: "/images/overview-dark.png" });
  const { props: light } = getImageProps({ ...common, src: "/images/overview-light.png" });
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" srcSet={dark.srcSet} sizes={dark.sizes} />
      <img
        {...light}
        alt={overviewAlt}
        className="block h-auto w-full rounded-t-2xl shadow-[0_20px_60px_-30px_rgb(15_23_42/0.35)]"
      />
    </picture>
  );
}

export default async function HomePage() {
  const user = await getCurrentUser();
  // Signed-out visitors sign up first; Upgrade then continues to billing, where checkout starts.
  const planActions = {
    free: { label: "Get started", href: user ? "/dashboard" : "/sign-up" },
    pro: {
      label: "Upgrade",
      href: user ? "/billing" : `/sign-up?callbackUrl=${encodeURIComponent("/billing")}`,
    },
  } as const;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
      <section className="flex flex-col gap-14">
        <div className="flex flex-col items-center gap-5 text-center">
          <h1 className="max-w-3xl text-4xl leading-[1.04] font-bold tracking-[-0.035em] sm:text-6xl lg:text-[4rem]">
            From lecture PDF
            <br />
            to exam-ready.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            Upload a chapter, practise with quizzes that explain every answer, and track how far
            you&apos;ve come.
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <Button size="lg" className="px-7 text-base font-semibold" asChild>
              {user ? (
                <Link href="/dashboard">Go to dashboard</Link>
              ) : (
                <Link href="/sign-up">Get started free</Link>
              )}
            </Button>
            <Button size="lg" variant="outline" className="px-7 text-base font-semibold" asChild>
              <Link href="/quizzes/sample">Try a sample quiz</Link>
            </Button>
          </div>
        </div>
        <FeatureBoxes />
      </section>

      <section id="progress" className="flex scroll-mt-8 flex-col gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">
            See your progress at a glance
          </h2>
          <p className="max-w-xl text-lg text-muted-foreground">
            Every attempt is saved. Your overview shows scores, streaks and the days you studied.
          </p>
        </div>
        <div className="rounded-[1.75rem] bg-primary/8 px-4 pt-4 sm:px-10 sm:pt-10">
          <OverviewScreenshot />
        </div>
      </section>

      <section id="pricing" className="flex scroll-mt-8 flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl leading-tight font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">
            Simple pricing
          </h2>
          <p className="text-lg text-muted-foreground">Start free. Upgrade when you study more.</p>
        </div>
        <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col gap-5 rounded-3xl p-8",
                plan.id === "pro" ? "border-2 border-primary bg-card" : "bg-muted/60",
              )}
            >
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-muted-foreground">{plan.summary}</p>
              </div>
              <div className="flex flex-col gap-3">
                {plan.intro ? <p className="text-sm font-semibold">{plan.intro}</p> : null}
                <ul className="flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <Check
                        className="size-4.5 shrink-0 text-primary"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                variant={plan.id === "pro" ? "default" : "outline"}
                className="mt-auto h-12 rounded-full font-semibold"
                asChild
              >
                <Link href={planActions[plan.id].href}>{planActions[plan.id].label}</Link>
              </Button>
            </div>
          ))}
        </div>
        {/* Stripe stays in test mode on the live site: this is a portfolio project. */}
        <p className="text-center text-sm text-muted-foreground">
          Demo project: payments run in Stripe test mode (card{" "}
          <span className="whitespace-nowrap">4242 4242 4242 4242</span>).
        </p>
      </section>
    </main>
  );
}
