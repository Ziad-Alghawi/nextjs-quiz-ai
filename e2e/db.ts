import postgres from "postgres";

/** The test server's own database, recreated by reset-db.ts before every run. */
export const E2E_DATABASE_URL = "postgres://quiz_ai:quiz_ai@localhost:5432/quiz_ai_e2e";

export const connect = () => postgres(E2E_DATABASE_URL, { max: 1, onnotice: () => {} });

type Sql = ReturnType<typeof connect>;

/** Adds a course for the account with this email and returns its id. */
export async function insertCourse(sql: Sql, email: string, name: string) {
  const [course] = await sql<{ id: number }[]>`
    insert into courses (user_id, name) select id, ${name} from "user" where email = ${email}
    returning id`;
  return course.id;
}

/**
 * Saves a quiz into the course the way a generation would, so tests can stand in for Gemini. Every
 * question has four options and the first one ("Right answer N") is correct.
 */
export async function insertQuiz(sql: Sql, courseId: number, name: string, questionCount: number) {
  return sql.begin(async (tx) => {
    const [quiz] = await tx<{ id: number }[]>`
      insert into quizzes (name, description, user_id, course_id)
      select ${name}, ${`A test quiz about ${name}.`}, user_id, id from courses where id = ${courseId}
      returning id`;
    for (let n = 1; n <= questionCount; n++) {
      const [question] = await tx<{ id: number }[]>`
        insert into questions (question_text, explanation, quiz_id)
        values (${`${name}: question ${n}?`}, ${`Explanation ${n}.`}, ${quiz.id})
        returning id`;
      const answers = ["Right", "Wrong", "Other", "Last"].map((word, i) => ({
        question_id: question.id,
        answer_text: `${word} answer ${n}`,
        is_correct: i === 0,
      }));
      await tx`insert into answers ${tx(answers)}`;
    }
    return quiz.id;
  });
}
