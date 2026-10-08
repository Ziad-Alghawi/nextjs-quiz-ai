import { quizzes } from "@/db/schema";
import { InferSelectModel } from "drizzle-orm";
import Link from "next/link";

export type Quiz = InferSelectModel<typeof quizzes>;

type Props = {
  quizzes: Quiz[];
};

const QuizzesTable = (props: Props) => {
  return (
    <div className="rounded-md overflow-hidden p-5 border">
      <table className="table-auto">
        <thead>
          <tr>
            <th className="text-muted-foreground text-left">Name</th>
            <th className="text-muted-foreground text-left">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.quizzes.map((quiz: Quiz) => (
            <tr key={quiz.id}>
              <td>
                <Link href={`/quizzes/${quiz.id}`}>
                  <p className="text-primary underline">{quiz.name}</p>
                </Link>
              </td>
              <td>{quiz.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QuizzesTable;
