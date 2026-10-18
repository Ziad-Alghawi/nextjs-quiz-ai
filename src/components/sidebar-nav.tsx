"use client";
import { BookOpen, CreditCard, LayoutDashboard, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import { NewCourseButton } from "./new-course-button";

type NavLinkProps = { href: string; icon: ComponentType<{ className?: string }>; label: string };

function NavLink({ href, icon: Icon, label }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

/** The signed-in navigation: overview, quick quiz, the user's courses, then account pages at the bottom. */
export function SidebarNav({ courses }: { courses: { id: number; name: string }[] }) {
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1">
      <NavLink href="/dashboard" icon={LayoutDashboard} label="Overview" />
      <NavLink href="/quizzes/new" icon={Zap} label="Quick quiz" />

      <div className="mt-4 flex items-center justify-between pl-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Courses
        </h2>
        <NewCourseButton />
      </div>
      <ul className="flex flex-col gap-1 overflow-y-auto">
        {courses.map((course) => (
          <li key={course.id}>
            <NavLink href={`/courses/${course.id}`} icon={BookOpen} label={course.name} />
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
