import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { notFound } from "next/navigation";
import { cache } from "react";
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
import { CourseQuizzes } from "./course-quizzes";
import { CourseActions } from "./course-actions";
import { DeleteChapterButton } from "./delete-chapter-button";
import { ExamForm } from "./exam-form";
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

  // The "My quizzes" folder only lists the quick quizzes: no chapters, generating, reviews or exams.
  if (course.isDefault) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading>{course.name}</PageHeading>
        <CourseQuizzes
          quizzes={course.quizzes}
          attempts={await listCourseAttempts(user.id, course.id)}
          emptyText="Quick quizzes you create land here."
        />
      </div>
    );
  }

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

      {/* Content on the left, actions on the right on wide screens; stacked below, the content
          comes first. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
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

          <CourseQuizzes
            quizzes={course.quizzes}
            attempts={attempts}
            emptyText="No quizzes in this course yet."
          />
        </div>

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

          <Card>
            <CardTitle>Course exam</CardTitle>
            {reviewSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Make a quiz in this course first.</p>
            ) : (
              <ExamForm
                courseId={course.id}
                available={reviewSources.reduce((total, quiz) => total + quiz.questionCount, 0)}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
