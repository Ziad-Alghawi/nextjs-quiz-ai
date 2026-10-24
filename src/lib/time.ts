export const MINUTE_MS = 60 * 1000;
export const DAY_MS = 24 * 60 * MINUTE_MS;

/** The date as YYYY-MM-DD in UTC, the day the database and the daily limits count in. */
export const utcDate = (date: Date = new Date()) => date.toISOString().slice(0, 10);
