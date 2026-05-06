import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function getErpSettings() {
  const settings = await db.setting.findMany({
    where: { key: { in: ["erpnext_base_url", "erpnext_endpoint", "erpnext_token"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    baseUrl: (map["erpnext_base_url"] || "").replace(/\/$/, ""),
    endpoint: map["erpnext_endpoint"] || "coordinators_access",
    token: map["erpnext_token"] || "",
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method");
    const term = searchParams.get("term");

    const { baseUrl, endpoint, token } = await getErpSettings();
    if (!baseUrl || !token) {
      return NextResponse.json({ error: "ERPNext not configured" }, { status: 503 });
    }

    let url = "";
    if (method === "exam_points") {
      url = `https://${baseUrl}/api/method/${endpoint}.get_available_exam_points`;
    } else if (method === "search" && term) {
      url = `https://${baseUrl}/api/method/${endpoint}.search_students_by_name?search_term=${encodeURIComponent(term)}`;
    } else {
      return NextResponse.json({ error: "Invalid method" }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { Authorization: `token ${token}` },
    });
    const data = await res.json();
    // Surface ERPNext errors with proper status
    if (!res.ok) {
      const errMsg = data?.exception || data?.error || `HTTP ${res.status}`;
      return NextResponse.json({ error: errMsg, erpnext_status: res.status, raw: data }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("ERPNext proxy error:", err);
    return NextResponse.json({ error: "ERPNext request failed", detail: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { student_name_id, new_exam_point } = body;

    const { baseUrl, endpoint, token } = await getErpSettings();
    if (!baseUrl || !token) {
      return NextResponse.json({ error: "ERPNext not configured" }, { status: 503 });
    }

    const url = `https://${baseUrl}/api/method/${endpoint}.update_student_exam_point`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ student_name_id, new_exam_point }),
    });
    const data = await res.json();
    if (!res.ok) {
      const errMsg = data?.exception || data?.error || `HTTP ${res.status}`;
      return NextResponse.json({ error: errMsg, erpnext_status: res.status, raw: data }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("ERPNext update error:", err);
    return NextResponse.json({ error: "ERPNext update failed", detail: err.message }, { status: 502 });
  }
}
