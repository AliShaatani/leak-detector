import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const { qrX, qrY, qrScale, marginMode, barcodeEnabled, barcodeAllPages } = await req.json();

    const data: any = {};
    if (qrX !== undefined) data.qrX = qrX;
    if (qrY !== undefined) data.qrY = qrY;
    if (qrScale !== undefined) data.qrScale = qrScale;
    if (marginMode !== undefined) data.marginMode = marginMode;
    if (barcodeEnabled !== undefined) data.barcodeEnabled = barcodeEnabled;
    if (barcodeAllPages !== undefined) data.barcodeAllPages = barcodeAllPages;

    const updated = await db.document.update({
      where: { id },
      data
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update coords error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
