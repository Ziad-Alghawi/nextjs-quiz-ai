import { signOut } from "@/auth";
import { getCurrentUser } from "@/server/session";
import { Button } from "./button";
import Image from "next/image";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NavMenu } from "../NavMenu";

function SignOut() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}

const Header = async () => {
  const user = await getCurrentUser();
  return (
    <header>
      <nav className="py-2.5 px-4">
        <div className="flex flex-wrap items-center justify-between mx-auto max-w-screen-xl">
          <h1 className="text-3xl font-bold">Qizz AI</h1>

          <div>
            {user ? (
              <div className="flex items-center gap-4">
                {user.name && user.image && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost">
                        <Image
                          src={user.image}
                          alt={user.name}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <NavMenu />
                  </DropdownMenu>
                )}
                <SignOut />
              </div>
            ) : (
              <Link href="/api/auth/signin">
                <Button variant="link" className="rounded-xl border ">
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
export default Header;
