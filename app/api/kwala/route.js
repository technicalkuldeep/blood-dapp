import { NextResponse } from "next/server";
import { pushEvent } from "../../lib/eventStore";

export async function POST(req) {
  try {
    const body = await req.json();
    const item = { timestamp: Date.now(), body };
    pushEvent(item);
    console.log("🪄 KWALA Event Received:", JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("KWALA webhook error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
