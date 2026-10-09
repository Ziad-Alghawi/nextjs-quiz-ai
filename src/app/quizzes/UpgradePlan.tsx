"use client";
import { useFormStatus } from "react-dom";
import { Lock, Flame } from "lucide-react";
import { startCheckout } from "@/app/actions/billing";
import { PLANS } from "@/lib/plans";

// useFormStatus only works in a component rendered inside the form. Disabled while the checkout
// request runs, so a double click doesn't start a second one.
const UpgradeButton = () => {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-primary text-primary-foreground hover:bg-primary-shadow p-10 w-full sm:h-80 sm:w-80 disabled:opacity-70"
    >
      <div className="flex flex-col items-center cursor-pointer w-full h-full">
        <div className="flex-1 flex items-center flex-col">
          <h2 className="text-xl font-bold mb-4">
            Upgrade to Pro for {PLANS.pro.monthlyQuizzes} quizzes a month
          </h2>
          <Lock className="w-12 h-12" />
        </div>
        <div className="flex w-full flex-row items-end justify-end">
          <div className="bg-white p-3 rounded-full text-black flex flex-row items-end justify-end gap-2">
            <Flame className="w-4 h-4 mr-2" />
            {pending ? "Opening checkout…" : "Upgrade"}
          </div>
        </div>
      </div>
    </button>
  );
};

const UpgradePlan = () => (
  <form action={startCheckout}>
    <UpgradeButton />
  </form>
);

export default UpgradePlan;
