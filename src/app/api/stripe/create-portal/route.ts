import { createBillingPortalSession } from "@/server/services/billing";
import { getCurrentUser } from "@/server/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "User not authenticated" }, { status: 401 });
  }

  const portalSession = await createBillingPortalSession(user.id);
  return Response.json({ url: portalSession.url });
}
