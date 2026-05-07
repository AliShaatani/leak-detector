import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    const now = new Date();

    // Fetch individual assignments — only non-expired
    const userAssignments = await db.assignment.findMany({
      where: { userId, expiry: { gt: now } },
      include: { document: true },
      orderBy: { createdAt: "desc" },
    });

    // Get user's groups
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { groups: true }
    });

    let groupAssignments: any[] = [];

    if (user && user.groups.length > 0) {
      const groupIds = user.groups.map(g => g.id);
      groupAssignments = await db.groupAssignment.findMany({
        where: { groupId: { in: groupIds }, expiry: { gt: now } },
        include: { document: true },
        orderBy: { createdAt: "desc" },
      });
    }

    // Merge and deduplicate by documentId
    const allAssignments = [...userAssignments, ...groupAssignments];
    const uniqueAssignmentsMap = new Map();
    
    allAssignments.forEach(assignment => {
      if (!uniqueAssignmentsMap.has(assignment.documentId)) {
        uniqueAssignmentsMap.set(assignment.documentId, assignment);
      } else {
        // If there's a conflict, keep the one with the latest expiry
        const existing = uniqueAssignmentsMap.get(assignment.documentId);
        if (new Date(assignment.expiry) > new Date(existing.expiry)) {
          uniqueAssignmentsMap.set(assignment.documentId, assignment);
        }
      }
    });

    // Fetch all categories to build paths
    const allCategories = await db.category.findMany();
    const categoryMap = new Map(allCategories.map(c => [c.id, c]));

    const buildCategoryPath = (categoryId: string | null): string => {
      if (!categoryId) return "";
      const path = [];
      let currentId: string | null = categoryId;
      while (currentId) {
        const cat = categoryMap.get(currentId);
        if (!cat) break;
        path.unshift(cat.name);
        currentId = cat.parentId;
      }
      return path.join(" / ");
    };

    const uniqueAssignments = Array.from(uniqueAssignmentsMap.values()).map((assignment: any) => ({
      ...assignment,
      document: {
        ...assignment.document,
        categoryPath: buildCategoryPath(assignment.document.categoryId)
      }
    }));

    // Safe sort by date
    uniqueAssignments.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    console.log(`Successfully fetched ${uniqueAssignments.length} assignments for user ${userId}`);
    return NextResponse.json(uniqueAssignments);
  } catch (error) {
    console.error("Fetch user assignments error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}
