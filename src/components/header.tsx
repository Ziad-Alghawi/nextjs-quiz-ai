import { redirect } from "next/navigation";
import { listCourses } from "@/server/services/courses";
import { getCurrentUser, signOut } from "@/server/session";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./mobile-sidebar";
import { NavMenu } from "./nav-menu";

function SignOut() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
        redirect("/");
      }}
    >
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}

export async function Header() {
  const user = await getCurrentUser();
  return (
    <header>
      <nav className="py-2.5 px-4">
        <div className="flex flex-wrap items-center justify-between mx-auto max-w-(--breakpoint-xl)">
          <div className="flex items-center gap-1">
            {user ? <MobileSidebar courses={await listCourses(user.id)} /> : null}
            <Link href="/" className="text-3xl font-bold">
              Quiz AI
            </Link>
          </div>

          <div>
            {user ? (
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" aria-label="Account menu">
                      {/* Email sign-ups have no profile picture; show the name's first letter. */}
                      {user.image ? (
                        <Image
                          src={user.image}
                          alt=""
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <NavMenu />
                </DropdownMenu>
                <SignOut />
              </div>
            ) : (
              <Button variant="link" className="rounded-xl border" asChild>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
