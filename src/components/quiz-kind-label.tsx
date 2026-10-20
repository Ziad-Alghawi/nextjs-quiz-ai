const KIND_LABELS = { review: "Review", exam: "Exam" } as const;

/** The label of a copied quiz; generated quizzes need none. */
export function QuizKindLabel({ kind }: { kind: "generated" | "review" | "exam" }) {
  if (kind === "generated") return null;

  return (
    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-primary">
      {KIND_LABELS[kind]}
    </span>
  );
}
