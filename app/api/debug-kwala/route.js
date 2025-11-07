// app/api/debug-kwala/route.js
import { NextResponse } from "next/server";

const CONFIG = {
  RPC: "https://rpc-amoy.polygon.technology",
  REGISTRY: "0x804FC2756e69EE020667520C758b75A208655968",
  NFT: "0xB1FEd5f9963893C4f7232e0A96A61eE460439D9c",
  ADMIN: "0xc277f4d2b4a84486a51c1ffcad9f091a11301286"
};

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    console.log("DEBUG_KWALA HIT body:", JSON.stringify(body));
    console.log("DEBUG_KWALA CONFIG:", CONFIG);
    return NextResponse.json({ ok: true, config_present: CONFIG, received: body });
  } catch (err) {
    console.error("DEBUG_KWALA ERROR:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
