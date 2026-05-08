import { NextRequest, NextResponse } from "next/server";
import { getErpSettings } from "@/lib/erp";

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
      url = `https://${baseUrl}/api/method/${endpoint}.search_students?search_term=${encodeURIComponent(term)}`;
    } else if (method === "student_details" && searchParams.get("student_name_id")) {
      const studentId = searchParams.get("student_name_id");
      url = `https://${baseUrl}/api/method/${endpoint}.get_student_exam_details?student_name_id=${encodeURIComponent(studentId!)}`;
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
