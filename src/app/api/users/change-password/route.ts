import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();

    // In a real app, we would verify the session/token here
    // For now, we assume the 'admin' user is changing their password
    const admin = await db.user.findUnique({
      where: { username: "admin" }
    });

    if (!admin) {
      return NextResponse.json({ error: "المسؤول غير موجود" }, { status: 404 });
    }

    // Verify current password (assuming plain text for now as per previous logic)
    if (admin.password !== currentPassword) {
      return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });
    }

    // Update password
    const updated = await db.user.update({
      where: { id: admin.id },
      data: { password: newPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json({ error: "فشل تحديث كلمة المرور" }, { status: 500 });
  }
}
