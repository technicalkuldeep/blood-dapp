// app/api/donor-events/route.js
// Serverless-friendly webhook + history store for Koala -> donor dashboard.
// POST  -> called by Koala to push an event
// GET   -> returns last N events (JSON array)

import { NextResponse } from "next/server";

const KWALA_SECRET = process.env.KWALA_SECRET || "";

// In-memory store (simple). Suitable for Vercel serverless sessions.
// For production persistence use a DB (Supabase, Redis, etc.)
globalThis.recentDonorEvents = globalThis.recentDonorEvents || [];

export async function POST(req) {
  try {
    const secret = req.headers.get("x-kwala-secret") || "";
    if (KWALA_SECRET && secret !== KWALA_SECRET) {
      return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 });
    }

    const body = await req.json();

    const event = {
      id: body.id ?? null,
      donor: body.donor ?? null,
      unitsApproved: body.unitsApproved ?? null,
      nftId: body.nftId ?? null,
      timestamp: body.timestamp ?? new Date().toISOString(),
      raw: body
    };

    // store at head
    globalThis.recentDonorEvents.unshift(event);
    if (globalThis.recentDonorEvents.length > 200) {
      globalThis.recentDonorEvents = globalThis.recentDonorEvents.slice(0, 200);
    }

    return NextResponse.json({ ok: true, stored: true, event });
  } catch (err) {
    console.error("donor-events POST error", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const events = globalThis.recentDonorEvents || [];
    return NextResponse.json({ ok: true, events });
  } catch (err) {
    console.error("donor-events GET error", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
