import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File;

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Try zbar-wasm or fallback approaches
    // We use Jimp for image processing + bwip-js can't decode, so we rely on 
    // a different strategy: use the sharp-based approach or zxing node
    
    // Strategy: Use the @zxing/library in a node-compatible way
    // Note: @zxing/library v0.22 requires Node >= 24 but we can try
    try {
      // Convert image to base64 PNG for processing
      // Use canvas (node-canvas) if available, otherwise return guidance
      const { createCanvas, loadImage } = await import("canvas").catch(() => {
        throw new Error("canvas_not_available");
      });

      const img = await loadImage(buffer);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Try multiple crops
      const W = img.width, H = img.height;
      const regions = [
        [0, 0, W, H, 2],
        [Math.floor(W * 0.5), 0, Math.floor(W * 0.5), Math.floor(H * 0.3), 3],
        [Math.floor(W * 0.6), 0, Math.floor(W * 0.4), Math.floor(H * 0.2), 5],
        [0, 0, W, Math.floor(H * 0.25), 3],
      ];

      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      for (const [sx, sy, sw, sh, scale] of regions) {
        const cropCanvas = createCanvas(sw * scale, sh * scale);
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(canvas as any, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
        try {
          const decoded = await reader.decodeFromCanvas(cropCanvas as any);
          if (decoded) {
            return NextResponse.json({ success: true, text: decoded.getText() });
          }
        } catch { /* try next */ }
      }

      return NextResponse.json({ success: false, reason: "no_barcode_found" });
    } catch (e: any) {
      if (e.message === "canvas_not_available") {
        return NextResponse.json({
          success: false,
          reason: "server_canvas_unavailable",
          hint: "Install node-canvas: npm install canvas"
        });
      }
      throw e;
    }
  } catch (error) {
    console.error("Server scan error:", error);
    return NextResponse.json({ error: "Server scan failed" }, { status: 500 });
  }
}
