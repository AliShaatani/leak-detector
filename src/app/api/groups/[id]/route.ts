import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const group = await db.userGroup.findUnique({
      where: { id },
      include: { users: true }
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json(group);
  } catch (error) {
    console.error("Group fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, userIds } = await req.json();

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    
    if (userIds && Array.isArray(userIds)) {
      dataToUpdate.users = {
        set: userIds.map((userId: string) => ({ id: userId }))
      };
    }

    const updated = await db.userGroup.update({
      where: { id },
      data: dataToUpdate,
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Group update error:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if it has assignments?
    // GroupAssignments will be cascade deleted if we configured it, but let's just delete it.
    await db.userGroup.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Group delete error:", error);
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
