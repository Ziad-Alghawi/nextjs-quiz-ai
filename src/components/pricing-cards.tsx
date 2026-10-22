import { Check } from "lucide-react";
import Link from "next/link";
import { startCheckout } from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { PLAN_FEATURES, PLANS, PRO_PRICES } from "@/lib/plans";
import { cn } from "@/lib/utils";

type LinkAction = { href: string };

/** What each card's button does: follow a link, start checkout for that interval, or nothing. */
export type PricingActions = {
  free: LinkAction | "current";
  month: LinkAction | "checkout";
  year: LinkAction | "checkout";
};

const cents = (amount: number) => Math.round(amount * 100) / 100;

const usd = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);

const yearlySaving = cents(PRO_PRICES.month * 12 - PRO_PRICES.year);
const yearlySavingPercent = Math.round((yearlySaving / (PRO_PRICES.month * 12)) * 100);

const cards = [
  {
    id: "free",
    name: PLANS.free.label,
    summary: "To get started",
    perMonth: 0,
    billed: null,
    intro: null,
    features: PLAN_FEATURES.free,
    cta: "Get started",
    style: {
      card: "bg-muted/60",
      muted: "text-muted-foreground",
      check: "text-primary",
      button: "border border-input bg-background text-foreground hover:bg-accent",
    },
  },
  {
    id: "month",
    name: "Pro Monthly",
    summary: "For regular studying",
    perMonth: PRO_PRICES.month,
    billed: "Billed monthly, cancel anytime",
    intro: "Everything in Free, plus:",
    features: PLAN_FEATURES.pro,
    cta: "Choose monthly",
    style: {
      card: "border-2 border-primary bg-card",
      muted: "text-muted-foreground",
      check: "text-primary",
      button: "bg-primary text-primary-foreground hover:bg-primary/90",
    },
  },
  {
    id: "year",
    name: "Pro Yearly",
    summary: "Best value for the whole year",
    perMonth: cents(PRO_PRICES.year / 12),
    billed: `${usd(PRO_PRICES.year)} billed once a year · save ${usd(yearlySaving)}`,
    intro: "Everything in Pro Monthly:",
    features: PLAN_FEATURES.pro,
    cta: "Choose yearly",
    style: {
      card: "bg-fill-blue text-on-fill",
      muted: "text-on-fill/80",
      check: "text-on-fill",
      button: "bg-on-fill text-fill-blue hover:bg-on-fill/90",
    },
  },
] as const;

const buttonClass = "mt-auto h-12 w-full rounded-full text-base font-semibold";

function CardAction({
  id,
  action,
  label,
  className,
}: {
  id: (typeof cards)[number]["id"];
  action: PricingActions[keyof PricingActions];
  label: string;
  className: string;
}) {
  if (action === "current") {
    return (
      <Button disabled className={cn(buttonClass, className)}>
        Current plan
      </Button>
    );
  }
  if (action === "checkout") {
    return (
      <form action={startCheckout} className="mt-auto">
        <input type="hidden" name="interval" value={id} />
        <SubmitButton pendingText="Opening checkout…" className={cn(buttonClass, className)}>
          {label}
        </SubmitButton>
      </form>
    );
  }
  return (
    <Button className={cn(buttonClass, className)} asChild>
      <Link href={action.href}>{label}</Link>
    </Button>
  );
}

/** Free, Pro Monthly and Pro Yearly side by side; the cards wrap below each other on narrow screens. */
export function PricingCards({ actions }: { actions: PricingActions }) {
  return (
    <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-4">
      {cards.map((card) => (
        <div
          key={card.id}
          className={cn("relative flex flex-col gap-5 rounded-3xl p-8", card.style.card)}
        >
          {card.id === "year" ? (
            <span className="absolute top-5 right-5 rounded-full bg-on-fill px-2.5 py-1 text-sm font-semibold text-fill-green">
              Save {yearlySavingPercent}%
            </span>
          ) : null}
          <div>
            <h3 className="text-lg font-semibold">{card.name}</h3>
            <p className={card.style.muted}>{card.summary}</p>
          </div>
          <div>
            <p className="flex items-baseline gap-1.5">
              <span className="text-5xl font-bold tracking-tight">{usd(card.perMonth)}</span>
              <span className={card.style.muted}>/ month</span>
            </p>
            {card.billed ? (
              <p className={cn("mt-1 text-sm", card.style.muted)}>{card.billed}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            {card.intro ? <p className="text-sm font-semibold">{card.intro}</p> : null}
            <ul className="flex flex-col gap-3">
              {card.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2.5">
                  <Check
                    className={cn("size-4.5 shrink-0", card.style.check)}
                    strokeWidth={2.5}
                    aria-hidden
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <CardAction
            id={card.id}
            action={actions[card.id]}
            label={card.cta}
            className={card.style.button}
          />
        </div>
      ))}
    </div>
  );
}
