import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const groups = await db.userGroup.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(groups);
  } catch (error) {
    console.error("Groups fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, userIds } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Group name is required" }, { status: 400 });
    }

    const group = await db.userGroup.create({
      data: {
        name,
        users: {
          connect: (userIds || []).map((id: string) => ({ id }))
        }
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json(group);
  } catch (error) {
    console.error("Group creation error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}
