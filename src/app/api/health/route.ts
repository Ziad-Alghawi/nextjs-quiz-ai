import { NextResponse } from "next/server";
import { pingDatabase } from "@/db/health";

export async function GET() {
  const databaseUp = await pingDatabase();

  return NextResponse.json(
    { status: databaseUp ? "ok" : "error", database: databaseUp ? "up" : "down" },
    { status: databaseUp ? 200 : 503 },
  );
}
