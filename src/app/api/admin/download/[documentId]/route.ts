import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PDFDocument, rgb } from "pdf-lib";
import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const { searchParams } = new URL(req.url);
    const adminUserId = searchParams.get("userId");

    if (!adminUserId) {
      return new NextResponse("Missing userId", { status: 400 });
    }

    // 1. Fetch the document
    const document = await db.document.findUnique({ where: { id: documentId } });
    if (!document) {
      return new NextResponse("Document not found", { status: 404 });
    }

    // 2. Fetch admin's displayId
    const rawUser: any[] = await db.$queryRaw(
      Prisma.sql`SELECT "displayId", "role" FROM "User" WHERE "id" = ${adminUserId}`
    );
    if (!rawUser?.[0] || rawUser[0].role !== "ADMIN") {
      return new NextResponse("Forbidden: Admin only", { status: 403 });
    }
    const displayId: string = rawUser[0].displayId || "ADMIN";

    // 3. Load the PDF
    const filePath = path.join(process.cwd(), "public/uploads", document.filename);
    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found on server", { status: 404 });
    }
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Read global barcode scale setting (default 100%)
    const scaleSettingRow = await db.setting.findUnique({ where: { key: "barcode_scale" } });
    const globalBarcodeScale = scaleSettingRow ? parseInt(scaleSettingRow.value, 10) / 100 : 1.0;

    // 4. Optionally generate Barcode
    let barcodeImage: any = null;
    if (document.barcodeEnabled) {
      const bwipjs = require("bwip-js");
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: displayId,
        scale: 5,
        height: 15,
        includetext: false,
        textxalign: "center",
      });
      barcodeImage = await pdfDoc.embedPng(barcodeBuffer);
    }

    // 5. Apply Security Stamps
    pdfDoc.setTitle("Admin Preview — Secure Document");
    pdfDoc.setAuthor(`ADMIN_${displayId}`);
    pdfDoc.setSubject(adminUserId);
    pdfDoc.setKeywords(["ADMIN-COPY", displayId, adminUserId]);

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Margin Encoding
    const seqStr = displayId.split("-").pop() || displayId;
    let seqNumber = parseInt(seqStr, 10);
    if (isNaN(seqNumber)) seqNumber = 0;
    const binaryArray = seqNumber.toString(2).padStart(8, "0").split("").map(b => parseInt(b, 10));
    const sequence = [1, 1, 1, 1, ...binaryArray, 0, 0, 0, 0];
    const dashLong = 6, dashShort = 2, gap = 3, thickness = 0.5;
    const black = rgb(0, 0, 0);
    const white = rgb(1, 1, 1);
    const marginMode = document.marginMode || "both";

    pdfDoc.getPages().forEach(page => {
      const { width, height } = page.getSize();

      // Invisible text trap — first page only
      if (page === firstPage) {
        page.drawText(displayId, { x: 10, y: height - 10, size: 2, color: white, opacity: 0.1 });
      }

      // Barcode stamp (only if enabled)
      if (barcodeImage) {
        const applyToThisPage = document.barcodeAllPages || page === firstPage;
        if (applyToThisPage) {
          const finalX = (document.qrX / 100) * width;
          const finalY = (1 - document.qrY / 100) * height;
          const bcWidth = 180 * document.qrScale * globalBarcodeScale;
          const bcHeight = 60 * document.qrScale * globalBarcodeScale;
          page.drawImage(barcodeImage, {
            x: finalX - bcWidth / 2,
            y: finalY - bcHeight / 2,
            width: bcWidth,
            height: bcHeight,
          });
        }
      }

      // Margin line encoding
      if (marginMode !== "none") {
        const drawSequence = (yPos: number) => {
          let currentX = 20;
          while (currentX < width - 20) {
            for (const bit of sequence) {
              if (currentX >= width - 20) break;
              const dashLength = bit === 1 ? dashLong : dashShort;
              page.drawLine({
                start: { x: currentX, y: yPos },
                end: { x: currentX + dashLength, y: yPos },
                thickness,
                color: black,
              });
              currentX += dashLength + gap;
            }
            currentX += 10;
          }
        };
        if (marginMode === "bottom" || marginMode === "both") drawSequence(10);
        if (marginMode === "top" || marginMode === "both") drawSequence(height - 10);
      }
    });

    // 6. Save and serve
    const modifiedPdfBytes = await pdfDoc.save();
    const safeFilename = encodeURIComponent(document.name.replace(/\s+/g, "_")) + `_admin_${displayId}.pdf`;

    return new NextResponse(Buffer.from(modifiedPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
        "Content-Length": modifiedPdfBytes.length.toString(),
      },
    });

  } catch (error) {
    console.error("Admin PDF download failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
