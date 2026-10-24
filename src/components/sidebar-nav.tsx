"use client";
import { BookOpen, CreditCard, Folder, LayoutDashboard, Settings, Zap } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { NewCourseButton } from "./new-course-button";

type NavLinkProps = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  /** Shown on hover; for labels that may be cut off. */
  title?: string;
};

/**
 * The link's icon, or a spinner while the page it opens is loading: pages render on the server, so
 * without it nothing would change until the new page arrives.
 */
function NavIcon({ icon: Icon }: { icon: NavLinkProps["icon"] }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className="shrink-0" /> : <Icon className="size-4 shrink-0" />;
}

function NavLink({ href, icon, label, title }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={title}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
      )}
    >
      <NavIcon icon={icon} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export type SidebarCourse = { id: number; name: string; isDefault: boolean };

/**
 * The signed-in navigation: overview, quick quiz and the "My quizzes" folder it fills, the user's
 * courses, then account pages at the bottom.
 */
export function SidebarNav({ courses }: { courses: SidebarCourse[] }) {
  // The folder exists once the first quick quiz is saved.
  const folder = courses.find((course) => course.isDefault);

  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1">
      <NavLink href="/dashboard" icon={LayoutDashboard} label="Overview" />
      <NavLink href="/quizzes/new" icon={Zap} label="Quick quiz" />
      {folder ? <NavLink href={`/courses/${folder.id}`} icon={Folder} label={folder.name} /> : null}

      <div className="mt-4 flex items-center justify-between pl-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Courses
        </h2>
        <NewCourseButton />
      </div>
      <ul className="flex flex-col gap-1 overflow-y-auto">
        {courses
          .filter((course) => !course.isDefault)
          .map((course) => (
            <li key={course.id}>
              <NavLink
                href={`/courses/${course.id}`}
                icon={BookOpen}
                label={course.name}
                title={course.name}
              />
            </li>
          ))}
      </ul>

      <div className="mt-auto flex flex-col gap-1 border-t pt-3">
        <NavLink href="/billing" icon={CreditCard} label="Billing" />
        <NavLink href="/settings" icon={Settings} label="Settings" />
      </div>
    </nav>
  );
}
