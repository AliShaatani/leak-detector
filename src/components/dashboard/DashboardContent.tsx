"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { FileText, Download, Clock, FolderOpen, AlertCircle, Search } from "lucide-react";

export default function DashboardContent() {
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");

  React.useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        if (!userId) { window.location.href = "/"; return; }
        const res = await fetch(`/api/assignments/user/${userId}`);
        if (res.ok) setAssignments(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  const handleDownload = (assignmentId: string) => {
    setDownloading(assignmentId);
    window.location.href = `/api/download/${assignmentId}`;
    setTimeout(() => setDownloading(null), 3000);
  };

  const filtered = assignments.filter(a =>
    !searchTerm ||
    a.document.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.document.categoryPath || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-wrap">
        <div className="spinner" />
        <p>جاري تحميل ملفاتك...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary strip */}
      <div className="summary-strip">
        <div className="summary-item">
          <span className="summary-num">{assignments.length}</span>
          <span className="summary-label">متاحة</span>
        </div>
      </div>

      {/* Search bar */}
      {assignments.length > 0 && (
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="بحث في الملفات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      )}

      {/* Files */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} strokeWidth={1} />
          <p>{searchTerm ? "لا توجد نتائج" : "لا توجد ملفات مخصصة لك حالياً"}</p>
        </div>
      ) : (
        <div className="file-list">
          {filtered.map(a => <FileCard key={a.id} assignment={a} onDownload={handleDownload} downloading={downloading} />)}
        </div>
      )}

      <style jsx global>{`
        .loading-wrap {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; min-height: 200px; gap: 16px;
          color: rgba(255,255,255,0.3);
        }
        .spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid rgba(59,130,246,0.2);
          border-top-color: #3b82f6;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .summary-strip {
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 16px 0; margin-bottom: 20px; gap: 0;
        }
        .summary-item { flex: 1; text-align: center; }
        .summary-num { display: block; font-size: 24px; font-weight: 900; color: #3b82f6; }
        .expired-num { color: #f87171; }
        .total-num { color: rgba(255,255,255,0.7); }
        .summary-label { font-size: 11px; color: rgba(255,255,255,0.35); font-weight: 600; }
        .summary-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.07); }

        .search-bar {
          display: flex; align-items: center; gap: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px; padding: 12px 16px; margin-bottom: 20px;
        }
        .search-icon { color: rgba(255,255,255,0.3); flex-shrink: 0; }
        .search-input {
          flex: 1; background: none; border: none; outline: none;
          color: #fff; font-size: 14px; font-family: inherit; direction: rtl;
        }
        .search-input::placeholder { color: rgba(255,255,255,0.25); }

        .empty-state {
          text-align: center; padding: 60px 0;
          color: rgba(255,255,255,0.2);
        }
        .empty-state p { margin-top: 16px; font-size: 14px; }

        .section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700;
          color: rgba(255,255,255,0.4);
          margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .dot-green { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
        .dot-red { background: #f87171; }

        .file-list { display: flex; flex-direction: column; gap: 12px; }
      `}</style>
    </div>
  );
}

function FileCard({ assignment, onDownload, downloading }: { assignment: any; onDownload: (id: string) => void; downloading: string | null }) {
  const isExpired = new Date() > new Date(assignment.expiry);
  const isDownloading = downloading === assignment.id;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${isExpired ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 18, padding: "16px 16px 14px", transition: "all 0.2s",
    }}>
      {/* Top row: icon + name + badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: isExpired ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.12)",
          color: isExpired ? "#f87171" : "#60a5fa",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <FileText size={22} />
        </div>

        <p style={{
          flex: 1, color: "#fff", fontWeight: 700, fontSize: 15, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {assignment.document.name}
        </p>

        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, flexShrink: 0,
          background: isExpired ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
          color: isExpired ? "#f87171" : "#4ade80",
          border: `1px solid ${isExpired ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
        }}>
          {isExpired ? "منتهي" : "متاح"}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        {assignment.document.categoryPath && (
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
            <FolderOpen size={12} />
            {assignment.document.categoryPath}
          </span>
        )}
        <span style={{ fontSize: 12, color: isExpired ? "#f87171" : "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={12} />
          {isExpired
            ? "انتهت الصلاحية"
            : `تنتهي ${formatDistanceToNow(new Date(assignment.expiry), { locale: ar, addSuffix: true })}`}
        </span>
      </div>

      {/* Action */}
      {isExpired ? (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(239,68,68,0.06)", color: "#f87171",
          border: "1px solid rgba(239,68,68,0.15)",
          borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 600,
        }}>
          <AlertCircle size={14} />
          انتهت صلاحية هذا الملف
        </div>
      ) : (
        <button
          onClick={() => onDownload(assignment.id)}
          disabled={isDownloading}
          style={{
            width: "100%", padding: "13px 0", border: "none", borderRadius: 14,
            background: isDownloading
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: isDownloading ? "rgba(255,255,255,0.3)" : "#fff",
            fontWeight: 700, fontSize: 14, cursor: isDownloading ? "not-allowed" : "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            boxShadow: isDownloading ? "none" : "0 4px 16px rgba(59,130,246,0.25)",
            transition: "all 0.2s",
          }}
        >
          {isDownloading
            ? <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> جاري التحضير...</>
            : <><Download size={16} /> تحميل نسختي</>}
        </button>
      )}
    </div>
  );
}

