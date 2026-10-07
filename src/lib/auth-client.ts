import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

/**
 * A message for a failed auth request. Specific causes stay generic on purpose: the server already
 * answers "invalid email or password" without saying which part was wrong.
 */
export function authErrorMessage(error: { status: number }, fallback: string) {
  return error.status === 429 ? "Too many attempts. Please try again in a few minutes." : fallback;
}
