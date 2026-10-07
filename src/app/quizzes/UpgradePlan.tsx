import { Lock, Flame } from "lucide-react";
import { startCheckout } from "@/app/actions/billing";

const UpgradePlan = () => {
  return (
    <form action={startCheckout}>
      <button
        type="submit"
        className="rounded-md bg-primary hover:bg-primary-shadow p-10 w-full sm:h-80 sm:w-80 "
      >
        <div className="flex flex-col items-center cursor-pointer w-full h-full">
          <div className="flex-1 flex items-center flex-col">
            <h2 className="text-xl font-bold mb-4">
              Subscribe to upload documents and create quizzes
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
    </form>
  );
};

export default UpgradePlan;
