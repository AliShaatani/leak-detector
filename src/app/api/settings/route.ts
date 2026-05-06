import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ALLOWED_KEYS = ["erpnext_base_url", "erpnext_endpoint", "erpnext_token", "barcode_scale"];

export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: ALLOWED_KEYS } },
    });
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    for (const key of ALLOWED_KEYS) {
      if (body[key] !== undefined) {
        await db.setting.upsert({
          where: { key },
          create: { key, value: String(body[key]) },
          update: { value: String(body[key]) },
        });
      }
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
