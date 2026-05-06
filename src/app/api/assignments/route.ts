import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userIds, groupIds, fileId, expiry } = await req.json();

    if (!userIds || !Array.isArray(userIds) || !Array.isArray(groupIds) || !fileId || !expiry) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const expiryDate = new Date(expiry);

    // Delete assignments for users that were unchecked
    await db.assignment.deleteMany({
      where: {
        documentId: fileId,
        userId: { notIn: userIds.length > 0 ? userIds : ["__empty__"] }
      }
    });

    // Delete group assignments for groups that were unchecked
    await db.groupAssignment.deleteMany({
      where: {
        documentId: fileId,
        groupId: { notIn: groupIds.length > 0 ? groupIds : ["__empty__"] }
      }
    });

    // Create or update assignments for all selected users
    const assignments = await Promise.all(
      userIds.map(async (userId: string) => {
        const existing = await db.assignment.findFirst({
          where: { documentId: fileId, userId }
        });
        if (existing) {
          return db.assignment.update({
            where: { id: existing.id },
            data: { expiry: expiryDate }
          });
        }
        return db.assignment.create({
          data: {
            userId,
            documentId: fileId,
            expiry: expiryDate,
          }
        });
      })
    );

    // Create or update group assignments for all selected groups
    const groupAssignments = await Promise.all(
      groupIds.map(async (groupId: string) => {
        const existing = await db.groupAssignment.findFirst({
          where: { documentId: fileId, groupId }
        });
        if (existing) {
          return db.groupAssignment.update({
            where: { id: existing.id },
            data: { expiry: expiryDate }
          });
        }
        return db.groupAssignment.create({
          data: {
            groupId,
            documentId: fileId,
            expiry: expiryDate,
          }
        });
      })
    );

    return NextResponse.json({ assignments, groupAssignments });
  } catch (error) {
    console.error("Assignment error:", error);
    return NextResponse.json({ error: "Failed to create assignments" }, { status: 500 });
  }
}
