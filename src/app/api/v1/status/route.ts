import { NextResponse } from "next/server";
import { readSystemStatus } from "@/lib/system-status";
export const dynamic = "force-dynamic";
export async function GET() {
  const status = await readSystemStatus();
  return NextResponse.json(status || { error: "unavailable" }, { status: status ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
