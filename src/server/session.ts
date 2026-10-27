import "server-only";
import { getSessionCookie } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { pingDatabase } from "@/db/health";
import { auth } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** A guest trying the app without an account; guests can't use account features. */
  isGuest: boolean;
};

/**
 * The signed-in user, or null. The only place the app reads the auth session. Cached per request:
 * the header, the layout and the page all ask, and each lookup costs two queries.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    // The customSession plugin turns every lookup error into "no session". With a session cookie,
    // check the database, so an outage shows the error page instead of looking signed out.
    if (getSessionCookie(requestHeaders) && !(await pingDatabase())) {
      throw new Error("Service temporarily unavailable: the database can't be reached.");
    }
    return null;
  }

  const { id, name, email, image, isAnonymous } = session.user;
  return { id, name, email, image: image ?? null, isGuest: isAnonymous };
});

/** The signed-in user; otherwise redirects to sign-in, which returns to `returnTo` afterwards. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`);
  return user;
}

/**
 * A user with an account, not a guest. Guests are sent to sign-up, which returns to `returnTo`;
 * visitors without a session are handled like requireUser.
 */
export async function requireAccount(returnTo: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (user.isGuest) redirect(`/sign-up?callbackUrl=${encodeURIComponent(returnTo)}`);
  return user;
}
