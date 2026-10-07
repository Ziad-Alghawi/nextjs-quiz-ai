import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/server/session";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export async function POST() {
  const userId = (await getCurrentUser())?.id;

  if (!userId) {
    return new Response(
      JSON.stringify({
        error: "User not authenticated",
      }),
      {
        status: 401,
      },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return new Response(
      JSON.stringify({
        error: "User not found",
      }),
      {
        status: 404,
      },
    );
  }

  let customer;

  if (user?.stripeCustomerId) {
    customer = {
      id: user.stripeCustomerId,
    };
  } else {
    const customerData: {
      metadata: {
        dbId: string;
      };
    } = {
      metadata: {
        dbId: userId,
      },
    };

    const response = await stripe.customers.create(customerData);

    customer = { id: response.id };
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${env.APP_URL}/billing`,
  });

  return new Response(JSON.stringify({ url: portalSession.url }), {
    status: 200,
  });
}
