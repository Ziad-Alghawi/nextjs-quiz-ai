import type { Metadata } from "next";
import { getSignInMethods } from "@/server/services/account";
import { googleErrorMessage } from "@/lib/oauth-errors";
import { requireUser } from "@/server/session";
import { Card, CardTitle } from "@/components/ui/card";
import { PageColumn } from "@/components/ui/page-column";
import { PageHeading } from "@/components/ui/page-heading";
import { AddPasswordForm } from "./add-password-form";
import { ChangeEmailForm } from "./change-email-form";
import { ChangePasswordForm } from "./change-password-form";
import { ConnectGoogleButton } from "./connect-google-button";
import { DeleteAccountForm } from "./delete-account-form";
import { NameForm } from "./name-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser("/settings");
  const methods = await getSignInMethods(user.id);
  // Set when connecting Google failed and Better Auth sent the user back here.
  const { error: googleError } = await searchParams;

  return (
    <PageColumn>
      <PageHeading>Settings</PageHeading>
      <Card>
        <CardTitle>Profile</CardTitle>
        <p className="text-sm">
          Email: <span className="font-medium">{user.email}</span>
        </p>
        <ChangeEmailForm currentEmail={user.email} />
        <NameForm name={user.name} />
      </Card>
      <Card>
        <CardTitle>Sign-in methods</CardTitle>
        <p className="text-sm">Google: {methods.google ? "connected" : "not connected"}</p>
        {methods.google ? null : <ConnectGoogleButton />}
        {/* A hint about what to do next rather than a failure, so it isn't shown in red. */}
        {googleError && !methods.google ? (
          <p role="status" className="text-sm text-muted-foreground">
            {googleErrorMessage(googleError)}
          </p>
        ) : null}
        {methods.password ? (
          <ChangePasswordForm email={user.email} />
        ) : (
          <AddPasswordForm email={user.email} />
        )}
      </Card>
      <Card className="border-destructive/40">
        <CardTitle>Delete account</CardTitle>
        <DeleteAccountForm hasPassword={methods.password} />
      </Card>
    </PageColumn>
  );
}
