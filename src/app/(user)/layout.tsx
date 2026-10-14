import { listCourses } from "@/server/services/courses";
import { getCurrentUser } from "@/server/session";
import { MobileSidebar } from "./mobile-sidebar";
import { SidebarNav } from "./sidebar-nav";

export default async function UserPagesLayout({ children }: { children: React.ReactNode }) {
  // Signed-out visitors get no sidebar; each page sends them to sign-in itself.
  const user = await getCurrentUser();
  const courses = user ? await listCourses(user.id) : [];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
      {user ? (
        <>
          <MobileSidebar courses={courses} />
          <aside className="hidden w-60 shrink-0 border-r p-3 md:block">
            <div className="sticky top-3 h-[calc(100dvh-5.5rem)]">
              <SidebarNav courses={courses} />
            </div>
          </aside>
        </>
      ) : null}
      <div className="mx-auto min-w-0 w-full max-w-3xl flex-1">{children}</div>
    </div>
  );
}
