import { NextResponse } from "next/server";
import { resolveIceServers } from "@/lib/ice";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const iceServers = await resolveIceServers(process.env);
    return NextResponse.json(
      { iceServers },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "TURN credentials are currently unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
