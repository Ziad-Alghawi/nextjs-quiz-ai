import UploadDoc from "../UploadDoc";
import UpgradePlan from "../UpgradePlan";
import { PLANS } from "@/lib/plans";
import { getMonthlyUsage } from "@/server/services/usage";
import { requireUser } from "@/server/session";

// Quotas count calendar months in UTC (the database clock), so the reset is the 1st at 00:00 UTC.
const nextMonthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
};

const page = async () => {
  const user = await requireUser("/quizzes/new");
  const { plan, used, limit } = await getMonthlyUsage(user.id);
  const remaining = Math.max(limit - used, 0);
  const resetDate = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(nextMonthStart());

  return (
    <div className="flex flex-col flex-1">
      <main className="pt-11 flex flex-col text-center items-center gap-4 flex-1 mt-24">
        <h2 className="text-3xl font-bold">What do you want to be quizzed about today?</h2>

        {remaining > 0 ? (
          <>
            <UploadDoc />
            <p className="text-sm text-muted-foreground">
              {remaining} of {limit} quizzes left this month ({PLANS[plan].label} plan)
            </p>
          </>
        ) : (
          <p role="status">
            You&apos;ve used all {limit} quizzes of the {PLANS[plan].label} plan this month.
            {plan === "pro" && ` Your quota resets on ${resetDate}.`}
          </p>
        )}

        {plan === "free" && (
          <div className="w-full max-w-sm mt-4">
            <UpgradePlan />
          </div>
        )}
      </main>
    </div>
  );
};

export default page;
