import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    
    const userAssignments = await db.assignment.findMany({
      where: { documentId }
    });

    const groupAssignments = await db.groupAssignment.findMany({
      where: { documentId }
    });

    return NextResponse.json({ userAssignments, groupAssignments });
  } catch (error) {
    console.error("Fetch assignments error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}
