import { NextRequest, NextResponse } from "next/server";
import { getErpSettings } from "@/lib/erp";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method");
    const assessment_plan = searchParams.get("assessment_plan");
    const student_group = searchParams.get("student_group");

    const { baseUrl, token } = await getErpSettings();
    if (!baseUrl || !token) {
      return NextResponse.json({ error: "ERPNext not configured" }, { status: 503 });
    }

    let erpMethod = "";
    let params = new URLSearchParams();

    if (method === "metadata" && assessment_plan) {
      erpMethod = "education.bulk_api.get_bulk_upload_metadata";
      params.append("assessment_plan", assessment_plan);
    } else if (method === "students" && assessment_plan && student_group) {
      erpMethod = "education.bulk_api.get_assessment_students";
      params.append("assessment_plan", assessment_plan);
      params.append("student_group", student_group);
    } else if (method === "search_plans") {
      erpMethod = "frappe.desk.search.search_link";
      params.append("txt", searchParams.get("term") || "");
      params.append("doctype", "Assessment Plan");
    } else {
      return NextResponse.json({ error: "Invalid method or missing parameters" }, { status: 400 });
    }

    const url = `https://${baseUrl}/api/method/${erpMethod}?${params.toString()}`;
    console.log(`[ERPNext Bulk API] Fetching: ${url}`);

    const res = await fetch(url, {
      headers: { Authorization: `token ${token}` },
    });

    const data = await res.json();
    console.log(`[ERPNext Bulk API] Response Status: ${res.status}`);

    if (!res.ok) {
      console.error(`[ERPNext Bulk API] Error Body:`, JSON.stringify(data, null, 2));
      // Return the actual message from ERPNext if available, otherwise return the whole data object
      const errorMessage = data.message || (data._server_messages ? JSON.parse(data._server_messages).join('\n') : null) || data.error || JSON.stringify(data);
      return NextResponse.json({ error: errorMessage }, { status: res.status });
    }
    return NextResponse.json(data.message || data);
  } catch (err: any) {
    console.error(`[ERPNext Bulk API] Runtime Error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { method, assessment_plan, scores_data, file_url, zero_missing } = body;

    const { baseUrl, token } = await getErpSettings();
    if (!baseUrl || !token) {
      return NextResponse.json({ error: "ERPNext not configured" }, { status: 503 });
    }

    // zero_drafts: mark each draft student with 0 scores directly,
    // then submit. Bypasses the ID-keyword matching in process_bulk_json_scores.
    if (method === "zero_drafts" && assessment_plan && Array.isArray(scores_data)) {
      let processed_count = 0;
      const errors: string[] = [];

      for (const entry of scores_data) {
        try {
          const markUrl = `https://${baseUrl}/api/method/education.bulk_api.mark_assessment_result`;
          const markRes = await fetch(markUrl, {
            method: "POST",
            headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ assessment_plan, scores: entry }),
          });
          if (markRes.ok) {
            processed_count++;
          } else {
            const errData = await markRes.json();
            errors.push(errData?.message || errData?.error || `HTTP ${markRes.status}`);
          }
        } catch (e: any) {
          errors.push(e.message);
        }
      }

      if (errors.length > 0 && processed_count === 0) {
        return NextResponse.json({ status: "error", message: errors.join(", ") });
      }

      // Submit all draft results for this assessment plan
      try {
        const submitUrl = `https://${baseUrl}/api/method/education.bulk_api.submit_assessment_results`;
        await fetch(submitUrl, {
          method: "POST",
          headers: { Authorization: `token ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ assessment_plan, student_group: body.student_group || "" }),
        });
      } catch (_) {
        // submit is best-effort
      }

      return NextResponse.json({ status: "success", processed_count });
    }

    let erpMethod = "";
    let payload: any = { assessment_plan, zero_missing };

    if (method === "process_json" && assessment_plan && scores_data) {
      erpMethod = "education.bulk_api.process_bulk_json_scores";
      payload.scores_data = scores_data;
    } else if (method === "process_excel" && assessment_plan && file_url) {
      erpMethod = "education.bulk_api.process_bulk_excel_scores";
      payload.file_url = file_url;
    } else {
      return NextResponse.json({ error: "Invalid method or missing parameters" }, { status: 400 });
    }

    const url = `https://${baseUrl}/api/method/${erpMethod}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    // ERPNext sometimes returns 200 even for failures if caught in the method
    // but usually status: "error" is in the message body.
    return NextResponse.json(data.message || data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
