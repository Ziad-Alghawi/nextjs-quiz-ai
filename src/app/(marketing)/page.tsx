import { getImageProps } from "next/image";
import Link from "next/link";
import { PricingCards } from "@/components/pricing-cards";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/session";
import { FeatureBoxes } from "./feature-boxes";

const overviewAlt = "Overview with quiz stats, the activity heatmap and study streaks";

// Below sm the whole overview would be too small to read, so phones get a screenshot of the phone
// layout, cut after the heatmap.
const PHONE = "(max-width: 639px)";
const DARK = "(prefers-color-scheme: dark)";

/** The overview screenshot for the screen size and color scheme; the browser downloads only one. */
function OverviewScreenshot() {
  const wide = {
    alt: overviewAlt,
    width: 2560,
    height: 1280,
    sizes: "(min-width: 1152px) 1024px, 100vw",
  };
  const phone = { alt: overviewAlt, width: 780, height: 1110, sizes: "100vw" };
  const sources = [
    {
      media: `${PHONE} and ${DARK}`,
      ...getImageProps({ ...phone, src: "/images/overview-phone-dark.png" }).props,
    },
    { media: PHONE, ...getImageProps({ ...phone, src: "/images/overview-phone-light.png" }).props },
    { media: DARK, ...getImageProps({ ...wide, src: "/images/overview-dark.png" }).props },
  ];
  const { props: light } = getImageProps({ ...wide, src: "/images/overview-light.png" });
  return (
    <picture>
      {sources.map((source) => (
        <source
          key={source.media}
          media={source.media}
          srcSet={source.srcSet}
          sizes={source.sizes}
          width={source.width}
          height={source.height}
        />
      ))}
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
  // Signed-out visitors and guests sign up first and choose monthly or yearly on the billing page.
  const upgrade =
    user && !user.isGuest
      ? "checkout"
      : { href: `/sign-up?callbackUrl=${encodeURIComponent("/billing")}` };
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
            {user?.isGuest ? (
              <Button size="lg" className="px-7 text-base font-semibold" asChild>
                <Link href="/try">Continue your trial</Link>
              </Button>
            ) : user ? (
              <Button size="lg" className="px-7 text-base font-semibold" asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button size="lg" className="px-7 text-base font-semibold" asChild>
                  <Link href="/sign-up">Get started free</Link>
                </Button>
                {/* No account needed; the trial page also links the sample quiz. */}
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-primary px-7 text-base font-semibold text-primary hover:bg-primary/10 hover:text-primary"
                  asChild
                >
                  <Link href="/try">Try it free</Link>
                </Button>
              </>
            )}
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
        <PricingCards
          actions={{
            free: { href: user ? "/dashboard" : "/sign-up" },
            month: upgrade,
            year: upgrade,
          }}
        />
        {/* Stripe stays in test mode on the live site: this is a portfolio project. */}
        <p className="text-center text-sm text-muted-foreground">
          Demo project: payments run in Stripe test mode (card{" "}
          <span className="whitespace-nowrap">4242 4242 4242 4242</span>).
        </p>
      </section>
    </main>
  );
}
