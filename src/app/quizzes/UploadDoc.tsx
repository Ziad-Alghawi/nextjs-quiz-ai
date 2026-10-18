"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { useRouter } from "next/navigation";
import { NETWORK_ERROR, readGenerationResponse } from "@/lib/generation-response";
import { pdfUploadSchema } from "@/lib/validations/quiz";

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
      const res = await fetch("/api/quizzes/generate", {
        method: "POST",
        body: formData,
      });
      const result = await readGenerationResponse(res);
      if ("href" in result) {
        // The browser keeps this page's server-rendered quota counter for the Back button; a route
        // handler can't invalidate that cache, so drop it here before leaving.
        router.refresh();
        // Stay in the loading state until the quiz page replaces this one.
        router.push(result.href);
        return;
      }
      setError(result.error);
    } catch {
      setError(NETWORK_ERROR);
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
        <FormError className="mt-2">{error}</FormError>
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
            "Generate Quiz"
          )}
        </Button>
      </form>
    </div>
  );
};
export default UploadDoc;
