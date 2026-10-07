import { auth, signIn } from "@/auth";
import { isSubscribed } from "@/server/services/billing";
import ManageSubscription from "./ManageSubscription";

const Page = async () => {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    signIn();
    return null;
  }

  const subscribed = await isSubscribed(session.user.id);
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
