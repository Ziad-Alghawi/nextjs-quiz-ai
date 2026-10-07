"use client";
import { useState } from "react";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { pdfUploadSchema } from "@/lib/validations/quiz";

const successResponseSchema = z.object({ quizId: z.number() });
const errorResponseSchema = z.object({ error: z.string() });

// Responses that never reached our route (e.g. Vercel's 413 or 504 pages) are not JSON.
function getErrorMessage(status: number, body: unknown): string {
  const parsed = errorResponseSchema.safeParse(body);
  if (parsed.success) return parsed.data.error;
  if (status === 413) return "This PDF is too large to upload.";
  if (status === 504) return "Generating the quiz took too long. Please try a shorter document.";
  return "Something went wrong while generating your quiz. Please try again.";
}

const UploadDoc = () => {
  const [document, setDocument] = useState<File | null | undefined>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const upload = await pdfUploadSchema.safeParseAsync(document);
    if (!upload.success) {
      setError(upload.error.issues[0].message);
      return;
    }
    setError(null);
    setIsLoading(true);
    const formData = new FormData();
    formData.append("pdf", upload.data);
    try {
      const res = await fetch("/api/quizz/generate", {
        method: "POST",
        body: formData,
      });
      const body: unknown = await res.json().catch(() => null);
      const success = successResponseSchema.safeParse(body);
      if (res.ok && success.success) {
        // Stay in the loading state until the quiz page replaces this one.
        router.push(`/quizz/${success.data.quizId}`);
        return;
      }
      setError(getErrorMessage(res.status, body));
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setIsLoading(false);
  };

  return (
    <div className="w-full">
      <form className="w-full" onSubmit={handleSubmit}>
        <label
          htmlFor="document"
          className="bg-secondary w-full flex h-20 rounded-md border-4 border-dashed border-blue-900 relative"
        >
          <div className="absolute inset-0 m-auto flex justify-center items-center">
            {document && document?.name ? document?.name : "Drag a file"}
          </div>
          <input
            type="file"
            id="document"
            accept="application/pdf,.pdf"
            disabled={isLoading}
            className="relative block w-full h-full z-50 opacity-0"
            onChange={(e) => {
              setDocument(e?.target?.files?.[0]);
              setError(null);
            }}
          />
        </label>
        {error ? (
          <p role="alert" className="text-red-500 mt-2">
            {error}
          </p>
        ) : null}
        <p role="status" aria-live="polite" className="text-sm text-muted-foreground mt-2">
          {isLoading ? "Generating your quiz. This can take up to a minute." : null}
        </p>
        <Button size="lg" className="mt-2" type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Quizz"
          )}
        </Button>
      </form>
    </div>
  );
};
export default UploadDoc;
