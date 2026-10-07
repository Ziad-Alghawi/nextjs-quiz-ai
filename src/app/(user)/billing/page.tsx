import { signIn } from "@/auth";
import { getCurrentUser } from "@/server/session";
import { isSubscribed } from "@/server/services/billing";
import ManageSubscription from "./ManageSubscription";

const Page = async () => {
  const user = await getCurrentUser();

  if (!user) {
    signIn();
    return null;
  }

  const subscribed = await isSubscribed(user.id);
  const plan = subscribed ? "premium" : "free";

  return (
    <div className="p-4 border rounded-md">
      <h1 className="text-4xl mb-3">Subscription Details</h1>
      <p className="mb-2">You are currently on the {plan} plan.</p>
      <ManageSubscription />
    </div>
  );
};

export default Page;
