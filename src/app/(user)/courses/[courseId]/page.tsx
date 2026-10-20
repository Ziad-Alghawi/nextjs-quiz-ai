import type { Metadata } from "next";
import { FileText, Play } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { MAX_CHAPTERS_PER_COURSE } from "@/lib/plans";
import { pluralize } from "@/lib/pluralize";
import { courseIdSchema } from "@/lib/validations/course";
import { getCourse } from "@/server/services/courses";
import { listCourseAttempts } from "@/server/services/attempts";
import { listReviewSources } from "@/server/services/quizzes";
import { getMonthlyUsage } from "@/server/services/usage";
import { requireUser } from "@/server/session";
import { ChapterUpload } from "./chapter-upload";
import { CourseActions } from "./course-actions";
import { DeleteChapterButton } from "./delete-chapter-button";
import { QuizAttempts } from "./quiz-attempts";
import { QuizGenerator } from "./quiz-generator";
import { ReviewQuizForm } from "./review-quiz-form";

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
  const user = await requireUser(`/courses/${course.id}`);
  const [{ plan, used, limit }, reviewSources, attempts] = await Promise.all([
    getMonthlyUsage(user.id),
    listReviewSources(user.id, course.id),
    listCourseAttempts(user.id, course.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        action={
          <CourseActions
            course={{ id: course.id, name: course.name }}
            chapterCount={course.chapters.length}
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
              {course.chapters.length} of {MAX_CHAPTERS_PER_COURSE}
            </span>
          </div>
          <ChapterUpload
            courseId={course.id}
            full={course.chapters.length >= MAX_CHAPTERS_PER_COURSE}
          />
          {course.chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chapters yet.</p>
          ) : (
            <ul className="divide-y">
              {course.chapters.map((chapter) => {
                const meta = `${pluralize(chapter.pageCount, "page")} · ${formatSize(chapter.sizeBytes)}`;
                return (
                  <li key={chapter.id} className="flex items-center gap-3 py-3">
                    <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1 text-sm text-muted-foreground">
                      <span className="block truncate text-base font-medium text-foreground">
                        {chapter.name}
                      </span>
                      {/* Beside the name from sm up; on phones it goes under it, so the name and
                          hint keep their width. */}
                      <span className="sm:hidden">{meta}</span>
                      {chapter.textTruncated ? (
                        <span className="block">Long PDF: quizzes use only its first part.</span>
                      ) : null}
                    </div>
                    <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">
                      {meta}
                    </span>
                    <DeleteChapterButton chapter={{ id: chapter.id, name: chapter.name }} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardTitle>Generate a quiz</CardTitle>
            {course.chapters.length === 0 ? (
              <p className="text-sm text-muted-foreground">Upload a chapter first.</p>
            ) : (
              <QuizGenerator
                courseId={course.id}
                chapters={course.chapters.map(({ id, name }) => ({ id, name }))}
                plan={plan}
                remaining={Math.max(limit - used, 0)}
              />
            )}
          </Card>

          <Card>
            <CardTitle>Review quiz</CardTitle>
            {reviewSources.length < 2 ? (
              <p className="text-sm text-muted-foreground">
                Make at least 2 quizzes in this course first.
              </p>
            ) : (
              <ReviewQuizForm courseId={course.id} quizzes={reviewSources} plan={plan} />
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
                    <div className="flex items-start gap-3 pt-3 pb-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/quizzes/${quiz.id}`}
                          className="font-medium text-primary underline-offset-4 wrap-break-word hover:underline"
                        >
                          {quiz.name}
                        </Link>
                        {quiz.kind === "review" ? (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 align-middle text-xs font-medium text-primary">
                            Review
                          </span>
                        ) : null}
                        {quiz.description ? (
                          <p className="mt-0.5 text-sm text-muted-foreground">{quiz.description}</p>
                        ) : null}
                      </div>
                      {/* Touch screens have no hover, so a visible button says where the quiz starts. */}
                      <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
                        <Link href={`/quizzes/${quiz.id}`} aria-label={`Start ${quiz.name}`}>
                          <Play className="size-3.5" aria-hidden />
                          Start
                        </Link>
                      </Button>
                    </div>
                    <QuizAttempts entry={attempts.get(quiz.id)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
