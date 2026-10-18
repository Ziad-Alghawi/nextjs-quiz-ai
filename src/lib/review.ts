import { shuffle } from "./shuffle";

/**
 * Picks `count` questions spread evenly over the quizzes (10 from 3 gives 4/3/3), random within each
 * quiz and in random order. A quiz with too few questions gives its share to the others; with fewer
 * questions than `count` in total, all of them are returned.
 */
export function pickReviewQuestions<T>(quizzes: readonly (readonly T[])[], count: number): T[] {
  const pools = quizzes.map((questions) => shuffle(questions));
  const taken = pools.map(() => 0);
  // A random turn order, so the quiz that gets one question more is not always the first.
  const order = shuffle(pools.map((_, index) => index));

  let left = count;
  while (left > 0 && taken.some((n, index) => n < pools[index].length)) {
    for (const index of order) {
      if (left === 0) break;
      if (taken[index] < pools[index].length) {
        taken[index]++;
        left--;
      }
    }
  }

  return shuffle(pools.flatMap((pool, index) => pool.slice(0, taken[index])));
}

/** "Review: A, B" for two quizzes, "Review: A + 2 more" for more. */
export function reviewName(quizNames: readonly string[]) {
  const [first, ...rest] = quizNames;
  return rest.length === 1
    ? `Review: ${first}, ${rest[0]}`
    : `Review: ${first} + ${rest.length} more`;
}
