import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type CurrentUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

/** The signed-in user, or null. The only place the app reads the auth session. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
  };
}

/** The signed-in user; otherwise redirects to sign-in, which returns to `returnTo` afterwards. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
  return user;
}
