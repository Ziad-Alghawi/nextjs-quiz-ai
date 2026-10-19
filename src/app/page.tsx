import { BarChart3, Check, FileUp, ListChecks } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { MAX_PDF_BYTES, PLANS } from "@/lib/plans";
import { getCurrentUser } from "@/server/session";

const maxPdfMegabytes = MAX_PDF_BYTES / (1024 * 1024);

const steps = [
  {
    icon: FileUp,
    title: "Upload a PDF",
    text: `Slides, notes or a chapter, up to ${maxPdfMegabytes} MB.`,
  },
  {
    icon: ListChecks,
    title: "Answer the questions",
    text: "AI writes multiple-choice questions; your answers are scored on the server.",
  },
  {
    icon: BarChart3,
    title: "Track your progress",
    text: "Your dashboard shows your quizzes, scores and study activity.",
  },
];

// Limits come from PLANS, the same config the server enforces.
const plans: { id: "free" | "pro"; name: string; summary: string; features: string[] }[] = [
  {
    id: "free",
    name: PLANS.free.label,
    summary: "To get started",
    features: [
      `${PLANS.free.monthlyQuizzes} quizzes a month`,
      `PDFs up to ${maxPdfMegabytes} MB`,
      "Dashboard with scores and activity",
    ],
  },
  {
    id: "pro",
    name: PLANS.pro.label,
    summary: "For regular studying",
    features: [`${PLANS.pro.monthlyQuizzes} quizzes a month`, "Everything in Free"],
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  // Signed-out visitors sign up first; Upgrade then continues to billing, where checkout starts.
  const planActions = {
    free: { label: "Get started", href: user ? "/quizzes/new" : "/sign-up" },
    pro: {
      label: "Upgrade",
      href: user ? "/billing" : `/sign-up?callbackUrl=${encodeURIComponent("/billing")}`,
    },
  } as const;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 py-12 sm:py-20">
      <section className="flex flex-col items-center gap-10 md:flex-row md:justify-between">
        <div className="flex max-w-lg flex-col gap-5 text-center md:text-left">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Turn your PDFs into quizzes
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your study material and Quiz AI writes multiple-choice questions about it, so you
            can test yourself in minutes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            {user ? (
              <Button size="lg" asChild>
                <Link href="/quizzes/new">Create a quiz</Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/sign-up">Get started free</Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link href="/quizzes/sample">Try a sample quiz</Link>
            </Button>
          </div>
        </div>
        <Image
          src="/images/owl-landing-no-bg.png"
          width={360}
          height={360}
          alt=""
          preload
          className="w-64 sm:w-80"
        />
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="text-center text-2xl font-semibold">How it works</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <li key={step.title}>
              <Card className="h-full gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden />
                </span>
                <CardTitle as="h3" className="text-base">
                  {step.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-8">
        <h2 className="text-center text-2xl font-semibold">Plans</h2>
        <div className="mx-auto grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          {plans.map((plan) => (
            <Card key={plan.name} className="gap-3">
              <div>
                <CardTitle as="h3">{plan.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.summary}</p>
              </div>
              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.id === "pro" ? "default" : "outline"}
                className="mt-auto"
                asChild
              >
                <Link href={planActions[plan.id].href}>{planActions[plan.id].label}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
