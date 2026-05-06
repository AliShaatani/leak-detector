import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, parentId } = await req.json();
    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name;
    if (parentId !== undefined) dataToUpdate.parentId = parentId;

    const updated = await db.category.update({
      where: { id },
      data: dataToUpdate
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if it has children or files
    const category = await db.category.findUnique({
      where: { id },
      include: { 
        children: true,
        documents: true 
      }
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category.children.length > 0 || category.documents.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete category with sub-items or files. Please move them first." 
      }, { status: 400 });
    }

    await db.category.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
