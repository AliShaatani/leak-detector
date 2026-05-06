import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET all categories in a flat list or tree structure
export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        children: true,
        _count: {
          select: { documents: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

// POST new category
export async function POST(req: NextRequest) {
  try {
    const { name, parentId } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        name,
        parentId: parentId || null,
      },
      include: {
        children: true,
        _count: {
          select: { documents: true }
        }
      }
    });

    return NextResponse.json(category);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
