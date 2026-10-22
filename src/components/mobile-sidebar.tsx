"use client";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SidebarNav, type SidebarCourse } from "./sidebar-nav";

/** Below the md breakpoint the sidebar opens as a drawer from the ☰ button in the header. */
export function MobileSidebar({ courses }: { courses: SidebarCourse[] }) {
  const pathname = usePathname();
  // Closes when a link inside is followed (the path changes).
  const [openedAt, setOpenedAt] = useState<string | null>(null);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={() => setOpenedAt(pathname)}
      >
        <Menu className="size-5" aria-hidden />
      </Button>
      <Dialog
        open={openedAt === pathname}
        onClose={() => setOpenedAt(null)}
        label="Navigation"
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] rounded-none border-0 border-r"
      >
        <div className="flex h-full flex-col gap-2 p-3">
          <Button
            variant="ghost"
            size="icon"
            className="self-end"
            aria-label="Close menu"
            onClick={() => setOpenedAt(null)}
          >
            <X className="size-4" aria-hidden />
          </Button>
          <div className="min-h-0 flex-1">
            <SidebarNav courses={courses} />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
