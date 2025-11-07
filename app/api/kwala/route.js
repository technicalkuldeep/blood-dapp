// app/api/kwala/route.js
import { NextResponse } from "next/server";
import { pushEvent, getEvents } from "../../lib/eventStore";

/**
 * Handles POST requests from Kwala when an event occurs.
 * e.g. { event: "LevelUpdated", donor, newLevel, totalDonations }
 */
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

/**
 * Handles GET requests from the frontend to fetch all stored events.
 */
export async function GET() {
  const events = getEvents();
  return NextResponse.json({ ok: true, events });
}
