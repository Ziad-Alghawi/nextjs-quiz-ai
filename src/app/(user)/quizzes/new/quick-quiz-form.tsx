"use client";
import { FileText, UploadCloud } from "lucide-react";
import { useId, useState } from "react";
import { QuestionCountPicker } from "@/components/question-count-picker";
import { GenerateQuizActions } from "@/components/generate-quiz-actions";
import { FormError } from "@/components/ui/form-error";
import { useQuizGeneration } from "@/hooks/use-quiz-generation";
import { DEFAULT_QUESTION_COUNT, type PlanId } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { pdfUploadSchema } from "@/lib/validations/quiz";

type QuickQuizFormProps = { plan: PlanId; remaining: number };

/** Generates a quiz from one PDF. The server decides what is allowed; this only displays it. */
export function QuickQuizForm({ plan, remaining }: QuickQuizFormProps) {
  const inputId = useId();
  const [file, setFile] = useState<File>();
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const { error, setError, generating, generate } = useQuizGeneration();
  const [dragging, setDragging] = useState(false);

  async function choose(chosen: File | undefined) {
    if (!chosen) return;
    // The same check as on the server, so obvious mistakes don't cost a request.
    const checked = await pdfUploadSchema.safeParseAsync(chosen);
    setFile(checked.success ? chosen : undefined);
    setError(checked.success ? undefined : checked.error.issues[0].message);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("questionCount", String(questionCount));
    void generate(() => fetch("/api/quizzes/generate", { method: "POST", body: formData }));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <input
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={generating}
          className="peer sr-only"
          onChange={(event) => {
            void choose(event.target.files?.[0]);
            // So choosing the same file again works.
            event.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            if (!generating) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!generating) void choose(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm text-muted-foreground transition-colors hover:bg-accent/50 peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
            dragging && "border-primary bg-primary/5 text-primary",
          )}
        >
          {file ? (
            <>
              <FileText className="size-6 text-primary" aria-hidden />
              <span className="max-w-full truncate font-medium text-foreground">{file.name}</span>
              <span>Click or drop another PDF to replace it.</span>
            </>
          ) : (
            <>
              <UploadCloud className="size-6" aria-hidden />
              <span className="font-medium text-foreground">
                Drop a PDF here or click to choose
              </span>
              <span>Up to 4 MB. The file isn&apos;t saved, only the quiz.</span>
            </>
          )}
        </label>
        <FormError className="mt-2">{error}</FormError>
      </div>

      <QuestionCountPicker
        plan={plan}
        value={questionCount}
        onChange={setQuestionCount}
        disabled={generating}
        hideUpgradeLink
      />

      <GenerateQuizActions
        generating={generating}
        disabled={!file}
        plan={plan}
        remaining={remaining}
      />
    </form>
  );
}
