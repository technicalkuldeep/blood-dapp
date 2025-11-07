// app/api/debug-kwala/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    // Log to Vercel server logs so you can inspect them
    console.log("DEBUG_KWALA HIT body:", JSON.stringify(body));
    console.log("DEBUG_KWALA ENV:", {
      NEXT_PUBLIC_RPC: process.env.NEXT_PUBLIC_RPC,
      NEXT_PUBLIC_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
      NEXT_PUBLIC_ADMIN_ADDRESS: process.env.NEXT_PUBLIC_ADMIN_ADDRESS,
      NEXT_PUBLIC_NFT_ADDRESS: process.env.NEXT_PUBLIC_NFT_ADDRESS
    });

    return NextResponse.json({
      ok: true,
      env_present: {
        NEXT_PUBLIC_RPC: !!process.env.NEXT_PUBLIC_RPC,
        NEXT_PUBLIC_REGISTRY_ADDRESS: !!process.env.NEXT_PUBLIC_REGISTRY_ADDRESS
      },
      received: body
    });
  } catch (err) {
    console.error("DEBUG_KWALA ERROR:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
