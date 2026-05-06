"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Card, Typography, Tabs, Button, Upload, Alert, Spin, Tag, Flex,
  Avatar, Divider, Table, Empty, Input, Space, message, App
} from "antd";
import {
  ScanOutlined, UploadOutlined, CameraOutlined, FileSearchOutlined,
  UserOutlined, CheckCircleOutlined, CloseCircleOutlined,
  WarningOutlined, HistoryOutlined, BarcodeOutlined, FilePdfOutlined
} from "@ant-design/icons";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const { Title, Text, Paragraph } = Typography;

// ── Margin binary decoder ─────────────────────────────────────
function decodeMarginSequence(bits: number[]): number | null {
  // Find start marker: 4 consecutive 1s
  let start = -1;
  for (let i = 0; i <= bits.length - 4; i++) {
    if (bits[i] === 1 && bits[i+1] === 1 && bits[i+2] === 1 && bits[i+3] === 1) {
      start = i + 4;
      break;
    }
  }
  if (start === -1 || start + 8 > bits.length) return null;
  const dataBits = bits.slice(start, start + 8);
  return parseInt(dataBits.join(""), 2);
}

// ── User Result Card ──────────────────────────────────────────
function UserResult({ user, source }: { user: any; source: string }) {
  const downloadCols = [
    { title: "الملف", dataIndex: "docName", key: "doc", render: (t: string) => <Text style={{ color: "#fff" }}>{t}</Text> },
    {
      title: "تاريخ التحميل", dataIndex: "downloadedAt", key: "dl",
      render: (d: string) => d
        ? <Tag color="orange">{new Date(d).toLocaleString("ar-EG")}</Tag>
        : <Tag color="default">لم يُحمَّل</Tag>
    },
    {
      title: "الصلاحية", dataIndex: "expiry", key: "exp",
      render: (d: string) => new Date() > new Date(d)
        ? <Tag color="error">منتهية</Tag>
        : <Tag color="success">سارية</Tag>
    },
  ];

  return (
    <Card
      style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(20,22,31,0.9) 100%)",
        border: "1px solid rgba(34,197,94,0.3)",
        borderRadius: 20,
        marginTop: 24,
      }}
      styles={{ body: { padding: 28 } }}
    >
      <Flex gap={16} align="center" style={{ marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <UserOutlined style={{ fontSize: 26, color: "#fff" }} />
        </div>
        <div>
          <Flex align="center" gap={8}>
            <Title level={4} style={{ color: "#fff", margin: 0 }}>{user.name}</Title>
            <Tag color="green" icon={<CheckCircleOutlined />}>تم التعرف عليه</Tag>
            <Tag color={user.role === "ADMIN" ? "red" : "blue"} style={{ fontWeight: 700 }}>
              {user.role === "ADMIN" ? "🛡️ مشرف" : "👤 مستخدم"}
            </Tag>
          </Flex>
          <Flex gap={8} style={{ marginTop: 4 }}>
            <Tag color="blue">@{user.username}</Tag>
            <Tag color="purple" icon={<BarcodeOutlined />}>{user.displayId}</Tag>
            <Tag color="default">مصدر: {source}</Tag>
          </Flex>
        </div>
      </Flex>

      <Divider style={{ borderColor: "rgba(255,255,255,0.08)" }} />

      <Flex align="center" gap={8} style={{ marginBottom: 16 }}>
        <HistoryOutlined style={{ color: "#f59e0b" }} />
        <Text strong style={{ color: "#f59e0b" }}>سجل التحميلات</Text>
        <Tag>{user.downloads?.length || 0} ملفات</Tag>
      </Flex>

      {user.downloads?.length > 0 ? (
        <Table
          columns={downloadCols}
          dataSource={user.downloads.map((d: any, i: number) => ({ ...d, key: i }))}
          pagination={false}
          size="small"
          className="scan-result-table"
        />
      ) : (
        <Empty description={<Text type="secondary">لا يوجد سجل تحميلات</Text>} />
      )}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ScanPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ users: any[]; found: boolean } | null>(null);
  const [scanSource, setScanSource] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [pdfMeta, setPdfMeta] = useState<{
    author?: string; subject?: string; keywords?: string;
    title?: string; displayId?: string; error?: string;
  } | null>(null);
  const [pdfScanning, setPdfScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualBits, setManualBits] = useState<number[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const lookup = useCallback(async (params: string, source: string) => {
    setLoading(true);
    setResult(null);
    setScanSource(source);
    try {
      const res = await fetch(`/api/admin/scan?${params}`);
      const data = await res.json();
      setResult(data);
    } catch {
      message.error("فشل الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── PDF Metadata Reader ───────────────────────────────────────
  const handlePdfUpload = async (file: File) => {
    setPdfMeta(null);
    setPdfScanning(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

      const author   = pdf.getAuthor()   || "";
      const subject  = pdf.getSubject()  || "";
      const keywords = pdf.getKeywords() || "";
      const title    = pdf.getTitle()    || "";

      // Extract displayId — formats: "System_User_XXXX-NNN" or "ADMIN_XXXX-NNN"
      let displayId = "";
      if (author.startsWith("System_User_"))    displayId = author.replace("System_User_", "");
      else if (author.startsWith("ADMIN_"))     displayId = author.replace("ADMIN_", "");
      else {
        // fallback: scan keywords for XXXX-NNN pattern
        const match = keywords.split(/[,\s]+/).find(k => /^\d{4}-\d{2,3}$/.test(k));
        if (match) displayId = match;
      }

      setPdfMeta({ author, subject, keywords, title, displayId });
      if (displayId) lookup(`displayId=${encodeURIComponent(displayId)}`, `ملف PDF`);
    } catch {
      setPdfMeta({ error: "تعذّر قراءة الملف. تأكد أنه ملف PDF صادر من هذا النظام." });
    } finally {
      setPdfScanning(false);
    }
    return false;
  };

  // ── Camera Scanner ──────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraActive(true);
    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Poll for barcodes
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const poll = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.drawImage(videoRef.current, 0, 0);
        try {
          const result = await reader.decodeFromCanvas(canvas);
          if (result) {
            clearInterval(poll);
            stopCamera();
            lookup(`displayId=${encodeURIComponent(result.getText())}`, "كاميرا");
          }
        } catch {}
      }, 500);
    } catch (e: any) {
      setCameraError(e.message || "لا يمكن الوصول إلى الكاميرا");
      setCameraActive(false);
    }
  }, [lookup]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  // ── Image Upload Scanner ────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    setLoading(true);
    setResult(null);

    const drawCrop = (src: HTMLImageElement, sx: number, sy: number, sw: number, sh: number, scale = 2): HTMLCanvasElement => {
      const c = document.createElement("canvas");
      c.width = sw * scale;
      c.height = sh * scale;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, c.width, c.height);
      return c;
    };

    try {
      const reader = new BrowserMultiFormatReader();
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.src = url;
      await new Promise(r => { img.onload = r; });
      URL.revokeObjectURL(url);

      const W = img.width, H = img.height;
      // Build a list of regions to try: [sx, sy, sw, sh, scale]
      const regions: [number, number, number, number, number][] = [
        [0, 0, W, H, 2],                          // full image upscaled
        [W * 0.5, 0, W * 0.5, H * 0.35, 3],       // top-right (most likely barcode location)
        [0, 0, W * 0.5, H * 0.35, 3],             // top-left
        [W * 0.5, 0, W * 0.5, H * 0.5, 3],        // top-right half
        [0, 0, W, H * 0.25, 3],                    // top strip
        [0, H * 0.75, W, H * 0.25, 3],            // bottom strip
        [0, 0, W, H * 0.5, 2],                    // top half
        [W * 0.25, 0, W * 0.5, H * 0.3, 4],       // top center zoom
        [W * 0.6, 0, W * 0.4, H * 0.2, 5],        // top-right corner high zoom
        [0, 0, W * 0.4, H * 0.2, 5],              // top-left corner high zoom
        [W * 0.5, H * 0.25, W * 0.5, H * 0.25, 4], // mid-right
        [0, H * 0.25, W * 0.5, H * 0.25, 4],      // mid-left
      ];

      for (const [sx, sy, sw, sh, scale] of regions) {
        const canvas = drawCrop(img, sx, sy, sw, sh, scale);
        try {
          const decoded = await reader.decodeFromCanvas(canvas);
          if (decoded) {
            const text = decoded.getText();
            lookup(`displayId=${encodeURIComponent(text)}`, `صورة مرفوعة — ${text}`);
            return false;
          }
        } catch { /* continue to next region */ }
      }

      message.loading({ content: "جاري المحاولة على السيرفر...", key: "srv" });
      // Fallback: try server-side decode with node-canvas
      const fd = new FormData();
      fd.append("image", file);
      const srvRes = await fetch("/api/admin/scan/image", { method: "POST", body: fd });
      const srvData = await srvRes.json();
      message.destroy("srv");

      if (srvData.success && srvData.text) {
        lookup(`displayId=${encodeURIComponent(srvData.text)}`, `سيرفر — ${srvData.text}`);
        return false;
      }

      message.warning("لم يتم اكتشاف باركود في الصورة. يمكنك استخدام تبويب 'بحث بالرقم' أو 'فك تشفير الهامش' يدوياً.");
      setLoading(false);
    } catch {
      message.error("فشل تحميل الصورة.");
      setLoading(false);
    }
    return false;
  };


  // ── Manual ID Lookup ────────────────────────────────────────
  const handleManualSearch = () => {
    if (!manualId.trim()) return;
    lookup(`displayId=${encodeURIComponent(manualId.trim())}`, "بحث يدوي");
  };

  // ── Margin Decoder ──────────────────────────────────────────
  const addBit = (bit: number) => setManualBits(b => [...b, bit]);
  const removeLast = () => setManualBits(b => b.slice(0, -1));
  const clearBits = () => setManualBits([]);

  const decodeMargin = () => {
    const seqNum = decodeMarginSequence(manualBits);
    if (seqNum === null) {
      message.error("لم يتم اكتشاف علامة البداية (4 شرطات طويلة). أعد الإدخال.");
      return;
    }
    lookup(`seq=${seqNum}`, `فك تشفير الهامش (تسلسل: ${seqNum})`);
  };

  const tabItems = [
    {
      key: "camera",
      label: <span><CameraOutlined /> كاميرا</span>,
      children: (
        <div>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            وجّه الكاميرا نحو الباركود (Code 128) المطبوع على الورقة لقراءته تلقائياً.
          </Paragraph>
          {cameraError && <Alert type="error" message={cameraError} style={{ marginBottom: 16 }} />}
          <div style={{
            width: "100%", maxWidth: 500, margin: "0 auto",
            borderRadius: 16, overflow: "hidden",
            border: "2px solid rgba(59,130,246,0.3)",
            background: "#000",
            display: cameraActive ? "block" : "none"
          }}>
            <video ref={videoRef} style={{ width: "100%", display: "block" }} muted playsInline />
          </div>
          <Flex justify="center" gap={16} style={{ marginTop: 20 }}>
            {!cameraActive ? (
              <Button type="primary" size="large" icon={<CameraOutlined />} onClick={startCamera}
                style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", border: "none", height: 50, borderRadius: 14 }}>
                تشغيل الكاميرا
              </Button>
            ) : (
              <Button danger size="large" onClick={stopCamera} style={{ height: 50, borderRadius: 14 }}>
                إيقاف الكاميرا
              </Button>
            )}
          </Flex>
        </div>
      )
    },
    {
      key: "image",
      label: <span><UploadOutlined /> رفع صورة</span>,
      children: (
        <div>
          <Paragraph type="secondary" style={{ marginBottom: 20 }}>
            ارفع صورة للورقة أو الملف. سيتم قراءة الباركود المطبوع تلقائياً.
          </Paragraph>
          <Upload.Dragger
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleImageUpload}
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(59,130,246,0.3)",
              borderRadius: 16
            }}
          >
            <div style={{ padding: "40px 0" }}>
              <UploadOutlined style={{ fontSize: 48, color: "#3b82f6", marginBottom: 16, display: "block" }} />
              <Text style={{ color: "#fff", fontSize: 16 }}>اسحب الصورة هنا أو انقر للاختيار</Text>
              <br />
              <Text type="secondary">JPG, PNG, WEBP مدعومة</Text>
            </div>
          </Upload.Dragger>
        </div>
      )
    },
    {
      key: "margin",
      label: <span><ScanOutlined /> فك تشفير الهامش</span>,
      children: (() => {
        // Live decode computation
        const liveStartIdx = (() => {
          for (let i = 0; i <= manualBits.length - 4; i++) {
            if (manualBits[i]===1 && manualBits[i+1]===1 && manualBits[i+2]===1 && manualBits[i+3]===1) return i;
          }
          return -1;
        })();
        const liveDataBits = liveStartIdx >= 0 && (liveStartIdx + 4 + 8) <= manualBits.length
          ? manualBits.slice(liveStartIdx + 4, liveStartIdx + 12)
          : null;
        const liveSeq = liveDataBits ? parseInt(liveDataBits.join(""), 2) : null;

        const getBitRole = (i: number): "pre" | "start" | "data" | "end" | "post" => {
          if (liveStartIdx < 0) return "pre";
          if (i < liveStartIdx) return "pre";
          if (i < liveStartIdx + 4) return "start";
          if (i < liveStartIdx + 12) return "data";
          if (i < liveStartIdx + 16) return "end";
          return "post";
        };
        const roleColor: Record<string, string> = { pre: "default", start: "success", data: "gold", end: "error", post: "default" };

        return (
          <div>
            {/* Visual instruction */}
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 14, padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(255,255,255,0.07)" }}>
              <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 8 }}>مثال على قراءة الهامش — من اليسار إلى اليمين:</Text>
              <Flex align="center" gap={6} style={{ direction: "ltr", flexWrap: "wrap" }}>
                {[1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0].map((b, i) => (
                  <div key={i} style={{
                    width: b === 1 ? 24 : 10, height: 4,
                    background: i < 4 ? "#22c55e" : i < 12 ? "#f59e0b" : "#ef4444",
                    borderRadius: 2, flexShrink: 0
                  }} />
                ))}
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginRight: 8 }}>← بداية (أخضر) | بيانات (أصفر) | نهاية (أحمر)</Text>
              </Flex>
            </div>

            {/* Live decode status */}
            {manualBits.length > 0 && (
              <div style={{
                background: liveSeq !== null ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${liveSeq !== null ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.2)"}`,
                borderRadius: 12, padding: "12px 16px", marginBottom: 16
              }}>
                {liveStartIdx < 0 ? (
                  <Text style={{ color: "#f59e0b" }}>⏳ لم يُعثر على علامة البداية بعد (4 شرطات طويلة متتالية)</Text>
                ) : liveSeq === null ? (
                  <Text style={{ color: "#f59e0b" }}>✓ علامة البداية موجودة — أدخل {12 - (manualBits.length - liveStartIdx - 4)} بت إضافية للبيانات</Text>
                ) : (
                  <Flex gap={12} align="center">
                    <CheckCircleOutlined style={{ color: "#22c55e", fontSize: 18 }} />
                    <div>
                      <Text style={{ color: "#22c55e", fontWeight: 700 }}>تم فك التشفير! الرقم التسلسلي: </Text>
                      <Tag color="green" style={{ fontSize: 16, padding: "2px 12px", fontWeight: 700 }}>{liveSeq}</Tag>
                      <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}> → سيبحث عن displayId ينتهي بـ -{String(liveSeq).padStart(3,"0")}</Text>
                    </div>
                  </Flex>
                )}
              </div>
            )}

            {/* Input buttons */}
            <Flex gap={12} justify="center" wrap="wrap" style={{ marginBottom: 16 }}>
              <Button size="large" onClick={() => addBit(1)} style={{ background: "rgba(59,130,246,0.15)", color: "#93c5fd", border: "2px solid rgba(59,130,246,0.4)", borderRadius: 12, height: 56, minWidth: 130, fontWeight: 700, fontSize: 15 }}>
                ━━━━ طويلة (1)
              </Button>
              <Button size="large" onClick={() => addBit(0)} style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "2px solid rgba(139,92,246,0.4)", borderRadius: 12, height: 56, minWidth: 130, fontWeight: 700, fontSize: 15 }}>
                ─ قصيرة (0)
              </Button>
              <Button size="large" onClick={removeLast} style={{ height: 56, borderRadius: 12 }}>⌫</Button>
              <Button size="large" danger onClick={clearBits} style={{ height: 56, borderRadius: 12 }}>مسح</Button>
            </Flex>

            {/* Bit stream display — color coded by role */}
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "16px 20px", minHeight: 60, marginBottom: 12, border: "1px solid rgba(255,255,255,0.08)", direction: "ltr", overflowX: "auto" }}>
              {manualBits.length === 0 ? (
                <Text type="secondary">ابدأ من اليسار (أول شرطة تراها من الهامش)...</Text>
              ) : (
                <Flex wrap="wrap" gap={4}>
                  {manualBits.map((b, i) => (
                    <Tag key={i} color={roleColor[getBitRole(i)]} style={{ fontFamily: "monospace", fontSize: 13, margin: 2, minWidth: 24, textAlign: "center" }}>
                      {b}
                    </Tag>
                  ))}
                </Flex>
              )}
            </div>

            <Text type="secondary" style={{ display: "block", marginBottom: 16, fontSize: 12 }}>
              {manualBits.length} بت &nbsp;|&nbsp;
              <span style={{ color: "#22c55e" }}>█ بداية</span> &nbsp;
              <span style={{ color: "#f59e0b" }}>█ بيانات (8 بت)</span> &nbsp;
              <span style={{ color: "#ef4444" }}>█ نهاية</span>
            </Text>

            <Button
              type="primary" size="large" block
              disabled={liveSeq === null}
              onClick={decodeMargin}
              style={{ height: 50, borderRadius: 14, background: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)", border: "none", fontWeight: 700 }}
            >
              {liveSeq !== null ? `بحث عن المستخدم رقم ${liveSeq}` : "فك التشفير والبحث عن المستخدم"}
            </Button>
          </div>
        );
      })()
    },
    {
      key: "manual",
      label: <span><FileSearchOutlined /> إدخال الرقم</span>,
      children: (
        <div>
          {/* Primary instruction */}
          <div style={{
            background: "linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.08) 100%)",
            border: "1px solid rgba(59,130,246,0.25)",
            borderRadius: 16, padding: "20px 24px", marginBottom: 24
          }}>
            <Flex align="center" gap={12} style={{ marginBottom: 8 }}>
              <BarcodeOutlined style={{ fontSize: 28, color: "#60a5fa" }} />
              <Text strong style={{ color: "#fff", fontSize: 16 }}>استخدم تطبيق قارئ الباركود على هاتفك</Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 13 }}>
              امسح الباركود المطبوع على الورقة بأي تطبيق (مثل تطبيقات المتجر)، ثم انسخ الرقم الظاهر والصقه أدناه.
            </Text>
          </div>

          <Space.Compact style={{ width: "100%" }}>
            <Input
              size="large"
              placeholder="مثال: 0000-001"
              value={manualId}
              onChange={e => setManualId(e.target.value)}
              onPressEnter={handleManualSearch}
              autoFocus
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(59,130,246,0.4)",
                color: "#fff",
                borderRadius: "14px 0 0 14px",
                height: 56, fontSize: 18, letterSpacing: 2
              }}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleManualSearch}
              icon={<FileSearchOutlined />}
              style={{ height: 56, borderRadius: "0 14px 14px 0", background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", border: "none", minWidth: 100, fontWeight: 700 }}
            >
              بحث
            </Button>
          </Space.Compact>

          <Text type="secondary" style={{ display: "block", marginTop: 12, fontSize: 12 }}>
            يمكنك أيضاً إدخال الرقم من خصائص ملف PDF (Author أو Subject في أي قارئ PDF)
          </Text>
        </div>
      )
    },
    {
      key: "pdf",
      label: <span><FilePdfOutlined /> فحص ملف PDF</span>,
      children: (
        <div>
          {/* Info banner */}
          <div style={{ background: "linear-gradient(135deg,rgba(239,68,68,0.08),rgba(220,38,38,0.04))", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
            <Flex align="center" gap={12} style={{ marginBottom: 6 }}>
              <FilePdfOutlined style={{ fontSize: 24, color: "#f87171" }} />
              <Text strong style={{ color: "#fff", fontSize: 15 }}>قراءة البيانات المخفية من ملف PDF</Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 13 }}>
              ارفع الملف المشبوه — سيقرأ النظام حقل Author و Keywords ويحدد المستخدم تلقائياً.
            </Text>
          </div>

          {/* Drop zone */}
          <Upload.Dragger accept=".pdf,application/pdf" showUploadList={false} beforeUpload={handlePdfUpload}
            style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(239,68,68,0.3)", borderRadius: 16 }}>
            <div style={{ padding: "32px 0" }}>
              {pdfScanning
                ? <Spin size="large" />
                : <FilePdfOutlined style={{ fontSize: 48, color: "#f87171", marginBottom: 12, display: "block" }} />}
              <Text style={{ color: "#fff", fontSize: 15 }}>اسحب ملف PDF هنا أو انقر للاختيار</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 13 }}>يجب أن يكون ملف PDF محمل من هذا النظام</Text>
            </div>
          </Upload.Dragger>

          {/* Metadata fields */}
          {pdfMeta && !pdfMeta.error && (
            <div style={{ marginTop: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
              <Text strong style={{ color: "#fff", fontSize: 15, display: "block", marginBottom: 16 }}>البيانات المستخرجة:</Text>
              <Flex vertical gap={10}>
                {([
                  { label: "المؤلف (Author)",    value: pdfMeta.author },
                  { label: "الموضوع (Subject)",  value: pdfMeta.subject },
                  { label: "الكلمات (Keywords)", value: pdfMeta.keywords },
                ] as {label:string; value?: string}[]).map(({ label, value }) => value ? (
                  <Flex key={label} gap={12} align="center">
                    <Text type="secondary" style={{ fontSize: 12, minWidth: 130, flexShrink: 0 }}>{label}</Text>
                    <Tag style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>{value}</Tag>
                  </Flex>
                ) : null)}

                {pdfMeta.displayId ? (
                  <div style={{ marginTop: 8, padding: "12px 16px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12 }}>
                    <Text style={{ color: "#4ade80", fontWeight: 700 }}>✅ رقم تعريفي: </Text>
                    <Tag color="success" style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 15, marginRight: 8 }}>{pdfMeta.displayId}</Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>— جاري البحث...</Text>
                  </div>
                ) : (
                  <Alert type="warning" message="لم يتم اكتشاف رقم تعريفي. قد يكون الملف غير مختوم من هذا النظام." showIcon style={{ borderRadius: 10 }} />
                )}
              </Flex>
            </div>
          )}
          {pdfMeta?.error && <Alert type="error" message={pdfMeta.error} showIcon style={{ marginTop: 16, borderRadius: 12 }} />}
        </div>
      )
    },
  ];

  // PDF first — most powerful detection method
  const orderedTabs = [
    tabItems.find(t => t.key === "pdf")!,
    tabItems.find(t => t.key === "manual")!,
    tabItems.find(t => t.key === "margin")!,
    tabItems.find(t => t.key === "image")!,
    tabItems.find(t => t.key === "camera")!,
  ];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      {/* Header */}
      <Flex align="center" gap={16} style={{ marginBottom: 32 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: "linear-gradient(135deg, #f43f5e 0%, #be123c 100%)",
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <ScanOutlined style={{ fontSize: 28, color: "#fff" }} />
        </div>
        <div>
          <Title level={2} style={{ color: "#fff", margin: 0, fontWeight: 900 }}>كاشف التسريبات</Title>
          <Text type="secondary">افحص المستندات المسرّبة وتعرّف على المصدر</Text>
        </div>
      </Flex>

      {/* Scanner Card */}
      <Card
        style={{
          background: "rgba(20,22,31,0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 24,
          backdropFilter: "blur(20px)"
        }}
        styles={{ body: { padding: 32 } }}
      >
        <Tabs
          items={orderedTabs}
          defaultActiveKey="manual"
          size="large"
          style={{ color: "#fff" }}
        />
      </Card>

      {/* Loading */}
      {loading && (
        <Flex justify="center" align="center" style={{ marginTop: 40, gap: 12 }}>
          <Spin size="large" />
          <Text style={{ color: "#fff", fontSize: 16 }}>جاري البحث في قاعدة البيانات...</Text>
        </Flex>
      )}

      {/* Results */}
      {!loading && result && (
        result.found && result.users.length > 0 ? (
          result.users.map((u, i) => <UserResult key={i} user={u} source={scanSource} />)
        ) : (
          <Card
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 20, marginTop: 24
            }}
            styles={{ body: { padding: 28, textAlign: "center" } }}
          >
            <CloseCircleOutlined style={{ fontSize: 48, color: "#ef4444", marginBottom: 12 }} />
            <Title level={4} style={{ color: "#fff", margin: "0 0 8px" }}>لم يتم التعرف على المستخدم</Title>
            <Text type="secondary">لا يوجد مستخدم مرتبط بهذا الرقم في قاعدة البيانات.</Text>
          </Card>
        )
      )}

      <style jsx global>{`
        .scan-result-table .ant-table { background: transparent !important; color: #fff !important; }
        .scan-result-table .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.03) !important;
          color: rgba(255,255,255,0.45) !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        }
        .scan-result-table .ant-table-tbody > tr > td { border-bottom: 1px solid rgba(255,255,255,0.04) !important; }
        .ant-tabs-tab { color: rgba(255,255,255,0.45) !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
        .ant-tabs-ink-bar { background: #3b82f6 !important; }
        .ant-tabs-nav::before { border-color: rgba(255,255,255,0.06) !important; }
        .ant-alert { border-radius: 12px !important; }
      `}</style>
    </div>
  );
}
