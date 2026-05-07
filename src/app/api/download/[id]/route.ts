import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PDFDocument, rgb } from "pdf-lib";
import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignmentId = id;

    // Get userId from query params (needed for group assignments watermarking)
    const { searchParams } = new URL(req.url);
    const userIdFromQuery = searchParams.get("userId");

    // 1. Fetch assignment with related user and file
    // Try individual assignment first
    let assignment: any = await db.assignment.findUnique({
      where: { id: assignmentId },
      include: { user: true, document: true },
    });

    let isGroupAssignment = false;

    if (!assignment) {
      // Try group assignment
      assignment = await db.groupAssignment.findUnique({
        where: { id: assignmentId },
        include: { document: true },
      });
      isGroupAssignment = !!assignment;
    }

    if (!assignment) {
      return new NextResponse("Assignment not found", { status: 404 });
    }

    // Resolve which userId to use for watermarking
    const effectiveUserId = isGroupAssignment ? userIdFromQuery : assignment.userId;

    if (!effectiveUserId) {
      return new NextResponse("User ID required for watermarking", { status: 400 });
    }

    // Direct raw fetch to bypass Prisma Client model sync issues for displayId
    const rawUser: any[] = await db.$queryRaw(
      Prisma.sql`SELECT "displayId" FROM "User" WHERE "id" = ${effectiveUserId}`
    );
    const displayId = rawUser?.[0]?.displayId || "ID-MISSING";

    // 2. Check if expired
    if (new Date() > assignment.expiry) {
      return new NextResponse("Download link has expired", { status: 403 });
    }

    // 3. Load the PDF
    const filePath = path.join(process.cwd(), "public/uploads", assignment.document.filename);
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Master file not found on server", { status: 404 });
    }
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // 4. Optionally generate Barcode (Code 128)
    let barcodeImage: any = null;

    // Read global barcode scale setting (default 100%)
    const scaleSettingRow = await db.setting.findUnique({ where: { key: "barcode_scale" } });
    const globalBarcodeScale = scaleSettingRow ? parseInt(scaleSettingRow.value, 10) / 100 : 1.0;

    if (assignment.document.barcodeEnabled) {
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

    // 5. Stamp the PDF
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    
    // Apply Hidden Digital Metadata
    pdfDoc.setTitle("Secure Exam Document");
    pdfDoc.setAuthor(`System_User_${displayId}`);
    pdfDoc.setSubject(effectiveUserId);
    pdfDoc.setKeywords(["CONFIDENTIAL", displayId, effectiveUserId]);

    // Apply Margin Encoding
    // Extract sequence number from format like "1234-001"
    const seqStr = displayId.split('-').pop() || displayId;
    let seqNumber = parseInt(seqStr, 10);
    if (isNaN(seqNumber)) seqNumber = 0;
    
    const binaryArray = seqNumber.toString(2).padStart(8, '0').split('').map(b => parseInt(b, 10));
    
    // Start marker: 4 ones, End marker: 4 zeros
    const sequence = [1, 1, 1, 1, ...binaryArray, 0, 0, 0, 0];
    
    const dashLong = 6;
    const dashShort = 2;
    const gap = 3;
    const thickness = 0.5;
    const black = rgb(0, 0, 0);
    const white = rgb(1, 1, 1);

    pages.forEach(page => {
      const { width, height } = page.getSize();
      
      // 1. Draw Invisible Text (Digital Trap) — first page only
      if (page === firstPage) {
        page.drawText(displayId, {
          x: 10,
          y: height - 10,
          size: 2,
          color: white,
          opacity: 0.1,
        });
      }

      // 2. Barcode (only if enabled)
      if (barcodeImage) {
        const applyToThisPage = assignment.document.barcodeAllPages || page === firstPage;
        if (applyToThisPage) {
          const finalX = (assignment.document.qrX / 100) * width;
          const finalY = (1 - assignment.document.qrY / 100) * height;
          const bcWidth = 180 * assignment.document.qrScale * globalBarcodeScale;
          const bcHeight = 60 * assignment.document.qrScale * globalBarcodeScale;
          page.drawImage(barcodeImage, {
            x: finalX - (bcWidth / 2),
            y: finalY - (bcHeight / 2),
            width: bcWidth,
            height: bcHeight,
          });
        }
      }

      // 3. Margin Line Encoding
      const marginMode = assignment.document.marginMode || "both"; // "top", "bottom", "both", "none"
      
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
                thickness: thickness,
                color: black,
              });
              currentX += dashLength + gap;
            }
            currentX += 10; // Gap between sequences
          }
        };

        if (marginMode === "bottom" || marginMode === "both") {
          drawSequence(10); // Bottom margin
        }
        if (marginMode === "top" || marginMode === "both") {
          drawSequence(height - 10); // Top margin
        }
      }
    });

    // 6. Save and Serve
    const modifiedPdfBytes = await pdfDoc.save();
    
    // Update downloadedAt ONLY for individual assignments
    if (!isGroupAssignment) {
      await db.assignment.update({
        where: { id: assignment.id },
        data: { downloadedAt: new Date() }
      });
    }

    const safeFilename = encodeURIComponent(assignment.document.name.replace(/\s+/g, "_")) + "_watermarked.pdf";

    return new NextResponse(Buffer.from(modifiedPdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
        "Content-Length": modifiedPdfBytes.length.toString(),
      },
    });

  } catch (error) {
    console.error("PDF generation failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
