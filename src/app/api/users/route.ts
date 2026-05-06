import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const users = await db.user.findMany({
      where: { role: "USER" },
      orderBy: { name: "asc" }
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, username, password, role } = await req.json();

    // Generate Display ID: 4-digits + sequence
    const userCount = await db.user.count();
    const random4 = Math.floor(1000 + Math.random() * 9000);
    const sequence = (userCount + 1).toString().padStart(3, '0');
    const displayId = `${random4}-${sequence}`;

    const user = await db.user.create({
      data: { name, username, password, role, displayId }
    });
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
