"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { 
  PlusOutlined, 
  MinusOutlined, 
  SaveOutlined, 
  CloseOutlined,
  LoadingOutlined,
  EnvironmentOutlined
} from "@ant-design/icons";
import { Button, Space, Typography, Spin, Tooltip } from "antd";

// Setup the worker using the official CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const { Text, Title } = Typography;

interface Props {
  fileUrl: string;
  initialX?: number;
  initialY?: number;
  onSave: (x: number, y: number, scale: number) => void;
  onClose: () => void;
}

export default function PdfPositioner({ fileUrl, initialX = 50, initialY = 50, onSave, onClose }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [scale, setScale] = useState(0.5); // Default zoom at 50%
  const [loading, setLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  const handleClick = (e: React.MouseEvent) => {
    const pageElement = e.currentTarget as HTMLElement;
    const rect = pageElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x, y });
  };

  return (
    <div className="pdf-editor-fullscreen">
      <header className="editor-header">
        <Space size={20}>
          <Button 
            icon={<CloseOutlined />} 
            onClick={onClose} 
            type="text" 
            style={{ color: "#8e8e96" }}
            className="hover-danger"
          />
          <div className="header-title">
            <Title level={5} style={{ margin: 0, color: "#fff" }}>تحديد موقع الرمز</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>X: {Math.round(pos.x)}% | Y: {Math.round(pos.y)}%</Text>
          </div>
        </Space>

        <div className="zoom-controls">
          <Button 
            icon={<MinusOutlined />} 
            onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} // Allow zoom out to 10%
            type="text"
            style={{ color: "#8e8e96" }}
          />
          <span className="zoom-value">{Math.round(scale * 100)}%</span>
          <Button 
            icon={<PlusOutlined />} 
            onClick={() => setScale(s => Math.min(s + 0.1, 3.0))} 
            type="text"
            style={{ color: "#8e8e96" }}
          />
        </div>

        <Button 
          type="primary" 
          icon={<SaveOutlined />} 
          onClick={() => onSave(pos.x, pos.y, scale)}
          size="large"
          style={{ background: "#22c55e", borderColor: "#22c55e", borderRadius: 10, fontWeight: 700 }}
        >
          حفظ الإحداثيات
        </Button>
      </header>

      <main className="editor-content">
        {loading && (
          <div className="loading-overlay">
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Text type="secondary" style={{ marginTop: 20 }}>جاري معالجة المستند...</Text>
          </div>
        )}

        <div className="viewport">
          <div className="document-container" onClick={handleClick}>
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={null}
            >
              <Page 
                pageNumber={1} 
                scale={scale * 2.5} // High-resolution base rendering
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="pdf-page"
              />
            </Document>

            {!loading && (
              <div 
                className="qr-marker"
                style={{ 
                  left: `${pos.x}%`, 
                  top: `${pos.y}%`,
                  width: 80, // Fixed size for better consistency
                  height: 80,
                }}
              >
                <div className="marker-core">
                  <div className="pulse-ring" />
                  <div className="center-dot" />
                </div>
                <div className="marker-label">موقع الرمز</div>
              </div>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .pdf-editor-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 280px;
          bottom: 0;
          background: #080a0f;
          z-index: 999999;
          display: flex;
          flex-direction: column;
        }

        .editor-header {
          height: 80px;
          background: #14161f;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          flex-shrink: 0;
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          background: rgba(0,0,0,0.2);
          border-radius: 12px;
          padding: 4px;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .zoom-value { padding: 0 20px; font-size: 14px; font-weight: 700; color: #fff; min-width: 65px; text-align: center; }

        .editor-content { flex: 1; overflow: hidden; position: relative; }

        .viewport {
          width: 100%;
          height: 100%;
          overflow: auto; /* Ensure both scrolls are enabled */
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px;
          scroll-behavior: smooth;
        }

        .document-container {
          position: relative;
          box-shadow: 0 40px 120px rgba(0,0,0,0.8);
          background: white;
          height: fit-content;
          min-width: fit-content; /* Critical for horizontal scroll */
          cursor: crosshair;
          border-radius: 12px;
          overflow: visible;
          flex-shrink: 0;
        }

        .qr-marker {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
          z-index: 100;
          pointer-events: none;
        }

        .marker-core {
          position: relative;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .center-dot {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
          z-index: 2;
        }

        .pulse-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid #3b82f6;
          border-radius: 50%;
          animation: marker-pulse 2s infinite;
          background: rgba(59, 130, 246, 0.1);
        }

        @keyframes marker-pulse {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .marker-label {
          background: #3b82f6;
          color: white;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          margin-top: 8px;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #080a0f;
          z-index: 200;
        }

        :global(.hover-danger:hover) {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
        }
      `}</style>
    </div>
  );
}
