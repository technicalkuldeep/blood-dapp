import { NextResponse } from "next/server";
import { pushEvent } from "../../lib/eventStore";

export async function POST(req) {
  try {
    const body = await req.json();
    const event = { timestamp: Date.now(), body };
    pushEvent(event);
    console.log("🪄 KWALA Event Received:", body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("KWALA webhook error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
