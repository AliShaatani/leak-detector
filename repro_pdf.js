const { PDFDocument, rgb } = require("pdf-lib");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");

async function testPdfProcess() {
  console.log("Starting PDF process test...");
  
  try {
    // Mock data based on the assignment we found
    const filename = "1778001005006-نموذج_امتحان_نهائي.pdf";
    const filePath = path.join("public/uploads", filename);
    const qrX = 79;
    const qrY = 19;
    const qrScale = 0.5;
    const userId = "cmosi29350002wsuwycnq6alf";
    const fileId = "cmosi25y00001wsuw9d4qmsr3";

    console.log("Loading PDF from:", filePath);
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log("PDF loaded.");

    const qrPayload = `https://docid.verify/${userId}-${fileId}`;
    console.log("Generating QR for:", qrPayload);
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 200,
    });
    
    const qrImageBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    console.log("QR embedded.");

    const pages = pdfDoc.getPages();
    const page = pages[pages.length - 1];
    const { width, height } = page.getSize();
    console.log(`Page size: ${width}x${height}`);

    const qrSize = 60 * qrScale;
    const finalX = (qrX / 100) * width;
    const finalY = (1 - qrY / 100) * height;

    page.drawImage(qrImage, {
      x: finalX - (qrSize / 2),
      y: finalY - (qrSize / 2),
      width: qrSize,
      height: qrSize,
    });
    console.log("QR drawn.");

    const modifiedPdfBytes = await pdfDoc.save();
    console.log("PDF saved. Size:", modifiedPdfBytes.length);
    
    fs.writeFileSync("test_output.pdf", modifiedPdfBytes);
    console.log("Success! Output saved to test_output.pdf");

  } catch (error) {
    console.error("CRITICAL ERROR:", error);
  }
}

testPdfProcess();
