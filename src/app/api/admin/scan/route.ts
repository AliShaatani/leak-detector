import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const displayId = searchParams.get("displayId");
  const seqNumber = searchParams.get("seq"); // for margin decode lookup

  try {
    let users: any[] = [];

    if (displayId) {
      // Direct displayId lookup — PostgreSQL syntax ($1, quoted identifiers)
      const raw: any[] = await db.$queryRaw(
        Prisma.sql`SELECT "id", "name", "username", "displayId", "role", "createdAt"
                   FROM "User" WHERE "displayId" = ${displayId} LIMIT 1`
      );
      users = raw;
    } else if (seqNumber) {
      // Sequence number lookup via SPLIT_PART (PostgreSQL) — ignores zero-padding
      const seqInt = parseInt(seqNumber, 10);
      const raw: any[] = await db.$queryRaw(
        Prisma.sql`SELECT "id", "name", "username", "displayId", "role", "createdAt"
                   FROM "User"
                   WHERE CAST(SPLIT_PART("displayId", '-', 2) AS INTEGER) = ${seqInt}`
      );
      users = raw;
    }

    if (!users.length) {
      return NextResponse.json({ found: false, users: [] });
    }

    // Enrich each user with their download history
    const enriched = await Promise.all(
      users.map(async (u) => {
        const downloads: any[] = await db.$queryRaw(
          Prisma.sql`SELECT a."id", a."downloadedAt", a."createdAt", a."expiry", d."name" as "docName"
                     FROM "Assignment" a
                     JOIN "Document" d ON a."documentId" = d."id"
                     WHERE a."userId" = ${u.id}
                     ORDER BY a."downloadedAt" DESC NULLS LAST`
        );
        return { ...u, downloads };
      })
    );

    return NextResponse.json({ found: true, users: enriched });
  } catch (error) {
    console.error("Scan lookup error:", error);
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}
