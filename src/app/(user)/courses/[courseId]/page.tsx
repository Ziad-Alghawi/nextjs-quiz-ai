import type { Metadata } from "next";
import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { MAX_CHAPTERS_PER_COURSE } from "@/lib/plans";
import { courseIdSchema } from "@/lib/validations/course";
import { getCourse } from "@/server/services/courses";
import { requireUser } from "@/server/session";
import { ChapterUpload } from "./chapter-upload";
import { CourseActions } from "./course-actions";
import { DeleteChapterButton } from "./delete-chapter-button";

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
    <div className="flex flex-col gap-6">
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

      {/* Side by side on wide screens, stacked below. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <Card className="gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle>Chapters</CardTitle>
            <span className="text-sm text-muted-foreground">
              {course.sources.length} of {MAX_CHAPTERS_PER_COURSE}
            </span>
          </div>
          <ChapterUpload
            courseId={course.id}
            full={course.sources.length >= MAX_CHAPTERS_PER_COURSE}
          />
          {course.sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chapters yet.</p>
          ) : (
            <ul className="divide-y">
              {course.sources.map((source) => {
                const meta = `${source.pageCount} ${source.pageCount === 1 ? "page" : "pages"} · ${formatSize(source.sizeBytes)}`;
                return (
                  <li key={source.id} className="flex items-center gap-3 py-3">
                    <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                      <span className="block truncate text-base font-medium text-foreground">
                        {source.name}
                      </span>
                      {/* Beside the name from sm up; on phones it goes under it, so the name and hint keep their width. */}
                      <span className="sm:hidden">{meta}</span>
                      {source.textTruncated ? (
                        <span className="block">Long PDF: quizzes use only its first part.</span>
                      ) : null}
                    </div>
                    <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
                      {meta}
                    </span>
                    <DeleteChapterButton chapter={{ id: source.id, name: source.name }} />
                  </li>
                );
              })}
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
    </div>
  );
}
