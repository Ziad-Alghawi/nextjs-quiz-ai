import { getSignInMethods } from "@/server/services/account";
import { googleErrorMessage } from "@/lib/oauth-errors";
import { requireUser } from "@/server/session";
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
      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm">
          Email: <span className="font-medium">{user.email}</span>
        </p>
        <ChangeEmailForm currentEmail={user.email} />
        <NameForm name={user.name} />
      </section>
      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-xl font-semibold">Sign-in methods</h2>
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
      </section>
      <section className="flex flex-col gap-3 rounded-md border border-red-300 p-4">
        <h2 className="text-xl font-semibold">Delete account</h2>
        <DeleteAccountForm hasPassword={methods.password} />
      </section>
    </div>
  );
};

export default SettingsPage;
