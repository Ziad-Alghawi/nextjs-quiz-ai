import { createCheckoutSession } from "@/server/services/billing";
import { getCurrentUser } from "@/server/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = await createCheckoutSession(user.id);
    return Response.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
