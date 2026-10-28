import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-response";
import { env } from "@/lib/env";
import { deleteExpiredGuests } from "@/server/services/guests";

/**
 * Deletes expired guests. Called once a day by Vercel Cron (vercel.json) and, in the cluster, by the
 * Helm CronJob, both with "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return errorResponse("Unauthorized.", 401);
  }
  return NextResponse.json({ deleted: await deleteExpiredGuests() });
}

// Without CRON_SECRET nobody can run it. Compared in constant time, so the answer time doesn't
// reveal how much of a guess was right.
function isAuthorized(header: string | null) {
  if (!env.CRON_SECRET || !header) return false;
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
