import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    // Find user in database
    const user = await db.user.findUnique({
      where: { username }
    });

    if (!user) {
      return NextResponse.json({ error: "اسم المستخدم غير موجود" }, { status: 401 });
    }

    // Check password (assuming plain text for now as per current DB state)
    if (user.password !== password) {
      return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
    }

    // Return user info and role
    return NextResponse.json({ 
      success: true, 
      role: user.role,
      name: user.name,
      displayId: user.displayId,
      id: user.id
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
