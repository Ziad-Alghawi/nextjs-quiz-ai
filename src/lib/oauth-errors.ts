// Better Auth sends people back from Google with ?error=<code> when sign-in or linking fails.
const messages = new Map([
  // Google sign-in found a password account whose email isn't verified yet, so Better Auth doesn't
  // link them on its own: whoever registered that address may not own it.
  [
    "account_not_linked",
    "This email already has an account with a password. Sign in with your password, then connect Google in Settings.",
  ],
  [
    "email_does_not_match",
    "Use the Google account with the same email address as your Quiz AI account.",
  ],
  [
    "account_already_linked_to_different_user",
    "This Google account is already connected to another Quiz AI account.",
  ],
]);

/** A message for a Google sign-in or linking error code; other failures get a generic one. */
export function googleErrorMessage(code?: string) {
  return (code && messages.get(code)) || "Signing in with Google failed. Please try again.";
}
