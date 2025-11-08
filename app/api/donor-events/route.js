// app/api/donor-events/route.js
// SSE broadcaster for Koala -> donor dashboards
// NOTE: This in-memory SSE approach works well for local dev and Node servers.
// It may not be reliable on some serverless platforms (Vercel Serverless / Edge).
// For production use a proper real-time backend (WebSocket/Pusher/Supabase Realtime).

import { NextResponse } from "next/server";

const KWALA_SECRET = process.env.KWALA_SECRET || "";

// Persist globals across module reloads in dev / single Node process
globalThis.sseClients = globalThis.sseClients || [];
globalThis.recentDonorEvents = globalThis.recentDonorEvents || [];

/**
 * GET: subscribe to Server-Sent Events
 * Returns a text/event-stream ReadableStream and stores its controller in globalThis.sseClients
 */
export async function GET(req) {
  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  };

  const stream = new ReadableStream({
    start(controller) {
      const id = Date.now() + Math.random();
      const client = { id, controller };
      globalThis.sseClients.push(client);

      // send last few events so client can catch up
      if (Array.isArray(globalThis.recentDonorEvents)) {
        for (const ev of globalThis.recentDonorEvents.slice(0, 10)) {
          try {
            controller.enqueue(`data: ${JSON.stringify(ev)}\n\n`);
          } catch (err) {
            // ignore enqueue failures
          }
        }
      }

      // cleanup when client disconnects
      const onAbort = () => {
        try { controller.close(); } catch (e) {}
        globalThis.sseClients = globalThis.sseClients.filter(c => c.id !== id);
      };

      if (req && req.signal) {
        req.signal.addEventListener("abort", onAbort);
      }
    },
    cancel() {
      // nothing extra
    }
  });

  return new Response(stream, { headers });
}

/**
 * POST: receive Koala webhook and broadcast to connected clients
 * Expected JSON body: { id, donor, unitsApproved, nftId, timestamp? }
 */
export async function POST(req) {
  try {
    const secret = req.headers.get("x-kwala-secret") || "";
    if (KWALA_SECRET && secret !== KWALA_SECRET) {
      return NextResponse.json({ ok: false, error: "invalid secret" }, { status: 401 });
    }

    const body = await req.json();
    const event = {
      id: body.id,
      donor: body.donor,
      unitsApproved: body.unitsApproved,
      nftId: body.nftId,
      timestamp: body.timestamp || new Date().toISOString()
    };

    // keep small recent cache
    globalThis.recentDonorEvents.unshift(event);
    if (globalThis.recentDonorEvents.length > 50) globalThis.recentDonorEvents = globalThis.recentDonorEvents.slice(0, 50);

    // broadcast to all clients
    const clients = globalThis.sseClients || [];
    for (const client of clients) {
      try {
        client.controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        // if enqueue fails, remove client
        globalThis.sseClients = globalThis.sseClients.filter(c => c.id !== client.id);
      }
    }

    return NextResponse.json({ ok: true, deliveredTo: (clients || []).length });
  } catch (err) {
    console.error("donor-events POST error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
