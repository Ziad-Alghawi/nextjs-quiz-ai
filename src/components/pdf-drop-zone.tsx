"use client";
import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type PdfDropZoneProps = {
  /** Called with the chosen or dropped files; checking them is up to the caller. */
  onFiles: (files: File[]) => void;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  /** What the zone says, e.g. the size limit or the chosen file. */
  children: ReactNode;
};

/** A dashed area to drop PDFs on, or click to choose them; keyboard users reach the file input. */
export function PdfDropZone({
  onFiles,
  multiple = false,
  disabled = false,
  className,
  children,
}: PdfDropZoneProps) {
  const inputId = useId();
  const [dragging, setDragging] = useState(false);

  function choose(list: FileList | null) {
    if (list && list.length > 0) onFiles([...list]);
  }

  return (
    <>
      <input
        id={inputId}
        type="file"
        multiple={multiple}
        accept="application/pdf,.pdf"
        disabled={disabled}
        className="peer sr-only"
        onChange={(event) => {
          choose(event.target.files);
          // So choosing the same file again works.
          event.target.value = "";
        }}
      />
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!disabled) choose(event.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 text-center text-sm text-muted-foreground transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-60 hover:bg-accent/50",
          dragging && "border-primary bg-primary/5 text-primary",
          className,
        )}
      >
        {children}
      </label>
    </>
  );
}
