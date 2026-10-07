import UploadDoc from "../UploadDoc";
import { getCurrentUser } from "@/server/session";
import { isSubscribed } from "@/server/services/billing";
import UpgradePlan from "../UpgradePlan";
import Link from "next/link";

const page = async () => {
  const userId = (await getCurrentUser())?.id;
  const subscribed = userId ? await isSubscribed(userId) : false;

  return (
    <div className="flex flex-col flex-1">
      <main className="pt-11 flex flex-col text-center items-center gap-4 flex-1 mt-24">
        <h2 className="text-3xl font-bold">What do you want to be quizzed about today?</h2>
        <UploadDoc />

        {!userId && (
          <p className="text-sm text-muted-foreground">
            Want to save your quizzes?{" "}
            <Link href="/api/auth/signin?callbackUrl=/quizz/new" className="underline">
              Sign in
            </Link>
          </p>
        )}

        {userId && !subscribed && (
          <div className="w-full max-w-sm mt-4">
            <UpgradePlan />
          </div>
        )}
      </main>
    </div>
  );
};

export default page;
