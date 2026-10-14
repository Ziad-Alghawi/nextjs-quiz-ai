"use client";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SidebarNav } from "./sidebar-nav";

/** Below the md breakpoint the sidebar opens as a drawer from a menu button. */
export function MobileSidebar({ courses }: { courses: { id: number; name: string }[] }) {
  const pathname = usePathname();
  // Closes when a link inside is followed (the path changes).
  const [openedAt, setOpenedAt] = useState<string | null>(null);

  return (
    <div className="border-b p-2 md:hidden">
      <Button variant="ghost" className="gap-2" onClick={() => setOpenedAt(pathname)}>
        <Menu className="size-4" aria-hidden />
        Menu
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
