import UploadDoc from "../UploadDoc";
import { requireUser } from "@/server/session";
import { isSubscribed } from "@/server/services/billing";
import UpgradePlan from "../UpgradePlan";

const page = async () => {
  const user = await requireUser("/quizzes/new");
  const subscribed = await isSubscribed(user.id);

  return (
    <div className="flex flex-col flex-1">
      <main className="pt-11 flex flex-col text-center items-center gap-4 flex-1 mt-24">
        <h2 className="text-3xl font-bold">What do you want to be quizzed about today?</h2>
        <UploadDoc />

        {!subscribed && (
          <div className="w-full max-w-sm mt-4">
            <UpgradePlan />
          </div>
        )}
      </main>
    </div>
  );
};

export default page;
