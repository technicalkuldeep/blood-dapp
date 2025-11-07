import { NextResponse } from "next/server";
import { pushEvent, getEvents } from "../../lib/eventStore";

export async function POST(req) {
  try {
    const raw = await req.json();
    let body = raw;

    // 🔧 Normalize donor object structure
    // Some Kwala webhooks send { donor: { "0xabc...": "" } }
    // We'll extract the first key if donor is an object
    if (body.donor && typeof body.donor === "object" && !Array.isArray(body.donor)) {
      const donorKeys = Object.keys(body.donor);
      if (donorKeys.length > 0) body.donor = donorKeys[0];
    }

    // 🔧 Ensure all numeric fields are integers
    body.newLevel = parseInt(body.newLevel || 0);
    body.totalDonations = parseInt(body.totalDonations || 0);

    const item = { timestamp: Date.now(), body };
    pushEvent(item);

    console.log("🪄 KWALA Event Stored:", JSON.stringify(body));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("KWALA webhook error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const events = getEvents();
  return NextResponse.json({ ok: true, events });
}
