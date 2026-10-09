import { getSignInMethods } from "@/server/services/account";
import { googleErrorMessage } from "@/lib/oauth-errors";
import { requireUser } from "@/server/session";
import { Card, CardTitle } from "@/components/ui/card";
import { AddPasswordForm } from "./AddPasswordForm";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ConnectGoogleButton } from "./ConnectGoogleButton";
import { DeleteAccountForm } from "./DeleteAccountForm";
import { NameForm } from "./NameForm";

const SettingsPage = async ({ searchParams }: { searchParams: Promise<{ error?: string }> }) => {
  const user = await requireUser("/settings");
  const methods = await getSignInMethods(user.id);
  // Set when connecting Google failed and Better Auth sent the user back here.
  const { error: googleError } = await searchParams;

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-4xl">Settings</h1>
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
    </div>
  );
};

export default SettingsPage;
