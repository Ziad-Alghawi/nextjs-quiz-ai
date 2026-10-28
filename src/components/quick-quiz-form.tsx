"use client";
import { FileText, UploadCloud } from "lucide-react";
import { useState } from "react";
import { QuestionCountPicker } from "@/components/question-count-picker";
import { GenerateQuizActions } from "@/components/generate-quiz-actions";
import { PdfDropZone } from "@/components/pdf-drop-zone";
import { FormError } from "@/components/ui/form-error";
import { useQuizGeneration } from "@/hooks/use-quiz-generation";
import { DEFAULT_QUESTION_COUNT, MAX_PDF_MB, type PlanId } from "@/lib/plans";
import { pdfUploadSchema } from "@/lib/validations/quiz";

type QuickQuizFormProps = {
  /** Locks the counts of a higher plan; guests have no plan and get `counts` instead. */
  plan?: PlanId;
  counts?: readonly number[];
  remainingText?: string;
};

/**
 * Generates a quiz from one PDF, for accounts and for the guest trial. The server decides what is
 * allowed; this only displays it.
 */
export function QuickQuizForm({ plan, counts, remainingText }: QuickQuizFormProps) {
  const [file, setFile] = useState<File>();
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const { error, setError, generating, generate } = useQuizGeneration();

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
        <PdfDropZone
          onFiles={(files) => void choose(files[0])}
          disabled={generating}
          className="py-8"
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
              <span>Up to {MAX_PDF_MB} MB. The file isn&apos;t saved, only the quiz.</span>
            </>
          )}
        </PdfDropZone>
        <FormError className="mt-2">{error}</FormError>
      </div>

      <QuestionCountPicker
        plan={plan}
        counts={counts}
        value={questionCount}
        onChange={setQuestionCount}
        disabled={generating}
        hideUpgradeLink
      />

      <GenerateQuizActions generating={generating} disabled={!file} remainingText={remainingText} />
    </form>
  );
}
