"use client";
import { Lock, Flame } from "lucide-react";
import { getStripe } from "@/lib/stripe-client";
import { PRICE_ID } from "@/lib/utils";

const UpgradePlan = () => {
  const onNavigateToUpgrade = async (price: string) => {
    try {
      const { sessionId } = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price }),
      }).then((res) => res.json());

      const stripe = await getStripe();
      stripe?.redirectToCheckout({ sessionId });
    } catch (error) {
      console.log("Subscribe Button Error:", error);
    }
  };

  return (
    <button
      onClick={() => onNavigateToUpgrade(PRICE_ID)}
      className="rounded-md bg-primary hover:bg-primary-shadow p-10 w-full sm:h-80 sm:w-80 "
    >
      <div className="flex flex-col items-center cursor-pointer w-full h-full">
        <div className="flex-1 flex items-center flex-col">
          <h2 className="text-xl font-bold mb-4">
            Subscribe to unload Documents and create quizzs
          </h2>
          <Lock className="w-12 h-12" />
        </div>
        <div className="flex w-full flex-row items-end justify-end">
          <div className="bg-white p-3 rounded-full text-black flex flex-row items-end justify-end gap-2">
            <Flame className="w-4 h-4 mr-2" />
            Upgrade
          </div>
        </div>
      </div>
    </button>
  );
};

export default UpgradePlan;
