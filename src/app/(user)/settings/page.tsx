import { requireUser } from "@/server/session";
import { NameForm } from "./NameForm";

const SettingsPage = async () => {
  const user = await requireUser("/settings");

  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="text-4xl">Settings</h1>
      <section className="flex flex-col gap-3 rounded-md border p-4">
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm">
          Email: <span className="font-medium">{user.email}</span>
        </p>
        <NameForm name={user.name} />
      </section>
    </div>
  );
};

export default SettingsPage;
