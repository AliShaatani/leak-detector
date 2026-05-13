import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/users/[id] - Verify user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ id: user.id, role: user.role, name: user.name });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Prevent deleting the main admin if possible (extra safety)
    const user = await db.user.findUnique({ where: { id } });
    if (user?.username === "admin") {
      return NextResponse.json({ error: "لا يمكن حذف حساب المسؤول الرئيسي" }, { status: 400 });
    }

    await db.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "فشل حذف المستخدم" }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Update user (e.g., password)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await req.json();

    const updated = await db.user.update({
      where: { id },
      data: { password }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "فشل تحديث بيانات المستخدم" }, { status: 500 });
  }
}
