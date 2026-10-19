/** "1 quiz", "3 quizzes": the count followed by the matching form of the noun. */
export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
