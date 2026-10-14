import type { Metadata } from "next";
import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { courseIdSchema } from "@/lib/validations/course";
import { getCourse } from "@/server/services/courses";
import { requireUser } from "@/server/session";
import { CourseActions } from "./course-actions";

type Props = { params: Promise<{ courseId: string }> };

// Shared by generateMetadata and the page, so a request loads the course once.
const loadCourse = cache(async (courseId: string) => {
  const id = courseIdSchema.safeParse(courseId);
  const user = await requireUser(`/courses/${courseId}`);
  const course = id.success ? await getCourse(user.id, id.data) : undefined;
  if (!course) notFound();
  return course;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await loadCourse((await params).courseId)).name };
}

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default async function CoursePage({ params }: Props) {
  const course = await loadCourse((await params).courseId);

  return (
    <div className="flex flex-col gap-6 p-4">
      <PageHeading
        action={
          <CourseActions
            course={{ id: course.id, name: course.name }}
            chapterCount={course.sources.length}
            quizCount={course.quizzes.length}
          />
        }
      >
        {course.name}
      </PageHeading>

      <Card className="gap-2">
        <CardTitle>Chapters</CardTitle>
        {course.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No chapters yet.</p>
        ) : (
          <ul className="divide-y">
            {course.sources.map((source) => (
              <li key={source.id} className="flex items-center gap-3 py-3">
                <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">{source.name}</span>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {source.pageCount} {source.pageCount === 1 ? "page" : "pages"} ·{" "}
                  {formatSize(source.sizeBytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="gap-2">
        <CardTitle>Quizzes</CardTitle>
        {course.quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quizzes in this course yet.</p>
        ) : (
          <ul className="divide-y">
            {course.quizzes.map((quiz) => (
              <li key={quiz.id}>
                <Link
                  href={`/quizzes/${quiz.id}`}
                  className="flex flex-col gap-0.5 rounded-md py-3 hover:bg-accent/50"
                >
                  <span className="font-medium">{quiz.name}</span>
                  {quiz.description ? (
                    <span className="text-sm text-muted-foreground">{quiz.description}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
