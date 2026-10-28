import { signOut } from "@/app/actions/account";
import { cn } from "@/lib/utils";
import { listCourses } from "@/server/services/courses";
import { getCurrentUser } from "@/server/session";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Logo } from "./logo";
import { MobileSidebar } from "./mobile-sidebar";
import { NavMenu } from "./nav-menu";

function SignOut() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost">
        Sign out
      </Button>
    </form>
  );
}

/** A guest's way out of the trial: an account keeps their quizzes. */
function GuestActions() {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted-foreground sm:inline">Free trial</span>
      <Button variant="ghost" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}

export async function Header() {
  const current = await getCurrentUser();
  // Guests get the app's header without the account parts: no sidebar, menu or sign-out.
  const isGuest = current?.isGuest === true;
  const user = isGuest ? null : current;
  return (
    <header>
      {/* Signed in, the header spans the screen: the logo sits above the sidebar, the avatar menu at
          the far right. */}
      <nav className={cn("px-4 py-2.5", user && "md:px-6")}>
        <div
          className={cn(
            "mx-auto flex flex-wrap items-center justify-between",
            user ? "max-w-none" : "max-w-(--breakpoint-xl)",
          )}
        >
          <div className="flex items-center gap-1">
            {user ? <MobileSidebar courses={await listCourses(user.id)} /> : null}
            <Logo />
          </div>

          <div>
            {isGuest ? (
              <GuestActions />
            ) : user ? (
              <div className="flex items-center gap-4">
                <SignOut />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label="Account menu"
                    >
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
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <NavMenu />
                </DropdownMenu>
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
