import Link from "next/link";
import { Card, CardTitle } from "@/components/ui/card";
import type { QuizSummary } from "@/server/services/quizzes";

export function QuizzesTable({ quizzes }: { quizzes: QuizSummary[] }) {
  return (
    <Card className="gap-2">
      <CardTitle>Your quizzes</CardTitle>
      {quizzes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quizzes yet.{" "}
          <Link href="/quizzes/new" className="font-medium text-primary hover:underline">
            Create your first quiz
          </Link>
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((quiz) => (
              <tr key={quiz.id} className="border-t">
                <td className="py-3 pr-4 align-top">
                  <Link href={`/quizzes/${quiz.id}`} className="font-medium hover:underline">
                    {quiz.name}
                  </Link>
                </td>
                <td className="py-3 text-muted-foreground">{quiz.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}
