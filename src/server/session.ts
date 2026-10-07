import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

/** The signed-in user, or null. The only place the app reads the auth session. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}

/** The signed-in user; otherwise redirects to sign-in, which returns to `returnTo` afterwards. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`);
  return user;
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
}
