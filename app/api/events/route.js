import { NextResponse } from "next/server";
import { getEvents } from "../../lib/eventStore";

export async function GET() {
  try {
    const events = getEvents();
    return NextResponse.json({ ok: true, events });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
