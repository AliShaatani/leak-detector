import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/assessment-logs — fetch all logs, newest first
export async function GET() {
  try {
    const logs = await db.assessmentLog.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(logs);
  } catch (err: any) {
    console.error("[AssessmentLog GET]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/assessment-logs — record a successful operation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assessmentPlan, courseName, studentGroup, submittedCount, operationType, performedBy } = body;

    if (!assessmentPlan || submittedCount === undefined || !operationType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const log = await db.assessmentLog.create({
      data: {
        assessmentPlan,
        courseName:    courseName    || "",
        studentGroup:  studentGroup  || "",
        submittedCount: Number(submittedCount),
        operationType,
        performedBy:   performedBy  || "غير معروف",
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (err: any) {
    console.error("[AssessmentLog POST]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
