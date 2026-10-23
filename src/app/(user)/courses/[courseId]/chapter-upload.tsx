"use client";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { PdfDropZone } from "@/components/pdf-drop-zone";
import { FormError } from "@/components/ui/form-error";
import { NETWORK_ERROR, PDF_TOO_LARGE } from "@/lib/generation-response";
import { MAX_PDF_MB } from "@/lib/plans";
import { pdfUploadSchema } from "@/lib/validations/quiz";

type Upload = { id: number; name: string; error?: string };

const errorBodySchema = z.object({ error: z.string() });

// Responses that never reached our route (e.g. Vercel's 413 page) are not JSON.
async function uploadError(response: Response) {
  const body = errorBodySchema.safeParse(await response.json().catch(() => null));
  if (body.success) return body.data.error;
  return response.status === 413
    ? PDF_TOO_LARGE
    : "Something went wrong while uploading. Please try again.";
}

let nextUploadId = 0;

/**
 * A drop zone that uploads PDFs into the course one after another. A file stays in the list while it
 * uploads, and with its error if it fails; a saved chapter moves to the server-rendered list.
 */
export function ChapterUpload({ courseId, full }: { courseId: number; full: boolean }) {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);

  const update = (id: number, change: Partial<Upload>) =>
    setUploads((current) => current.map((u) => (u.id === id ? { ...u, ...change } : u)));
  const remove = (id: number) => setUploads((current) => current.filter((u) => u.id !== id));

  async function uploadFiles(files: File[]) {
    const added = files.map((file) => ({ id: nextUploadId++, name: file.name }));
    setUploads((current) => [...current, ...added]);

    let limitMessage: string | null = null;
    for (const [index, file] of files.entries()) {
      const { id } = added[index];
      if (limitMessage) {
        update(id, { error: `Not uploaded. ${limitMessage}` });
        continue;
      }

      // The same check as on the server, so obvious mistakes don't cost a request.
      const checked = await pdfUploadSchema.safeParseAsync(file);
      if (!checked.success) {
        update(id, { error: checked.error.issues[0].message });
        continue;
      }

      const formData = new FormData();
      formData.append("pdf", file);
      try {
        const response = await fetch(`/api/courses/${courseId}/sources`, {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          remove(id);
          router.refresh();
          continue;
        }
        const message = await uploadError(response);
        // Further uploads would be refused for the same reason.
        if (response.status === 429 || response.status === 403) limitMessage = message;
        update(id, { error: message });
      } catch {
        update(id, { error: NETWORK_ERROR });
      }
    }
  }

  if (full) {
    return (
      <p className="text-sm text-muted-foreground">
        This course has the most chapters it can hold. Delete one to add another.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <PdfDropZone multiple onFiles={(files) => void uploadFiles(files)} className="py-6">
        <UploadCloud className="size-6" aria-hidden />
        <span className="font-medium text-foreground">Drop PDFs here or click to choose</span>
        <span>Up to {MAX_PDF_MB} MB each. The text is saved; the file isn&apos;t.</span>
      </PdfDropZone>

      {uploads.length > 0 ? (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {uploads.map((upload) => (
            <li key={upload.id} className="rounded-md border bg-secondary/50 px-3 py-2">
              <div className="flex items-center gap-3">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{upload.name}</span>
                {upload.error ? (
                  <button
                    type="button"
                    aria-label={`Dismiss ${upload.name}`}
                    onClick={() => remove(upload.id)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : (
                  <Loader2
                    className="size-4 shrink-0 motion-safe:animate-spin text-primary"
                    aria-label="Uploading"
                  />
                )}
              </div>
              <FormError className="mt-1">{upload.error}</FormError>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
