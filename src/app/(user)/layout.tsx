import { listCourses } from "@/server/services/courses";
import { getCurrentUser } from "@/server/session";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function UserPagesLayout({ children }: LayoutProps<"/">) {
  // Signed-out visitors and guests get no sidebar; each page sends them on itself. On phones the
  // sidebar is a drawer opened from the header.
  const user = await getCurrentUser();
  const hasAccount = user !== null && !user.isGuest;
  const courses = hasAccount ? await listCourses(user.id) : [];

  return (
    <div className="flex w-full flex-1">
      {hasAccount ? (
        <aside className="hidden w-60 shrink-0 border-r md:block">
          {/* Pinned to the left edge below the 3.75rem header (40px buttons + 2 x 10px padding), as
              tall as what is left of the screen. */}
          <div className="sticky top-0 h-[calc(100dvh-3.75rem)] p-3">
            <SidebarNav courses={courses} />
          </div>
        </aside>
      ) : null}
      <div className="mx-auto w-full max-w-[1600px] min-w-0 flex-1 p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
