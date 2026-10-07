import { getSignInMethods } from "@/server/services/account";
import { requireUser } from "@/server/session";
import { AddPasswordForm } from "./AddPasswordForm";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { NameForm } from "./NameForm";

const SettingsPage = async () => {
  const user = await requireUser("/settings");
  const methods = await getSignInMethods(user.id);

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
        {methods.password ? (
          <p className="text-sm">Password: set</p>
        ) : (
          <AddPasswordForm email={user.email} />
        )}
      </section>
    </div>
  );
};

export default SettingsPage;
