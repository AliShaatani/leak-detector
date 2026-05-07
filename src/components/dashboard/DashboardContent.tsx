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
          color: var(--text-mute);
        }
        .spinner {
          width: 36px; height: 36px; border-radius: 50%;
          border: 3px solid var(--elevated);
          border-top-color: #3b82f6;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .summary-strip {
          display: flex; align-items: center; justify-content: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px; padding: 16px 0; margin-bottom: 20px; gap: 0;
        }
        .summary-item { flex: 1; text-align: center; }
        .summary-num { display: block; font-size: 24px; font-weight: 900; color: var(--accent); }
        .expired-num { color: var(--danger); }
        .total-num { color: var(--text-main); }
        .summary-label { font-size: 11px; color: var(--text-dim); font-weight: 600; }
        .summary-divider { width: 1px; height: 36px; background: var(--border); }

        .search-bar {
          display: flex; align-items: center; gap: 10px;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 14px; padding: 12px 16px; margin-bottom: 20px;
        }
        .search-icon { color: var(--text-mute); flex-shrink: 0; }
        .search-input {
          flex: 1; background: none; border: none; outline: none;
          color: var(--text-main); font-size: 14px; font-family: inherit; direction: rtl;
        }
        .search-input::placeholder { color: var(--text-mute); }

        .empty-state {
          text-align: center; padding: 60px 0;
          color: var(--text-mute);
        }
        .empty-state p { margin-top: 16px; font-size: 14px; }

        .section-title {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700;
          color: var(--text-dim);
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
      background: "var(--surface)",
      border: `1px solid ${isExpired ? "var(--danger)" : "var(--border)"}`,
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
          flex: 1, color: "var(--text-main)", fontWeight: 700, fontSize: 15, margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {assignment.document.name}
        </p>

        <span style={{
          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 50, flexShrink: 0,
          background: isExpired ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
          color: isExpired ? "#f87171" : "#4ade80",
          background: isExpired ? "var(--danger-bg)" : "var(--success-bg)",
          color: isExpired ? "var(--danger)" : "var(--success)",
          border: `1px solid ${isExpired ? "var(--danger-border)" : "var(--success-border)"}`,
        }}>
          {isExpired ? "منتهي" : "متاح"}
        </span>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        {assignment.document.categoryPath && (
          <span style={{ fontSize: 12, color: "var(--text-mute)", display: "flex", alignItems: "center", gap: 4 }}>
            <FolderOpen size={12} />
            {assignment.document.categoryPath}
          </span>
        )}
        <span style={{ fontSize: 12, color: isExpired ? "var(--danger)" : "var(--text-mute)", display: "flex", alignItems: "center", gap: 4 }}>
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
          background: "var(--danger-bg)", color: "var(--danger)",
          border: "1px solid var(--danger-border)",
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
              ? "var(--elevated)"
              : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            color: isDownloading ? "var(--text-mute)" : "#fff",
            fontWeight: 700, fontSize: 14, cursor: isDownloading ? "not-allowed" : "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            boxShadow: isDownloading ? "none" : "0 4px 16px rgba(59,130,246,0.25)",
            transition: "all 0.2s",
          }}
        >
          {isDownloading
            ? <><span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid var(--border)", borderTopColor: "var(--accent)", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> جاري التحضير...</>
            : <><Download size={16} /> تحميل نسختي</>}
        </button>
      )}
    </div>
  );
}

