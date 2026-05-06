"use client";

import React, { useState, useCallback, useRef } from "react";

interface Student {
  name: string;
  student_name: string;
  student_id: string;
  exam_points: string;
  type_of_registration?: string;
}

interface ExamPoint {
  name: string;
  title: string;
  city?: string;
}

export default function StudentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchError, setSearchError] = useState("");

  const [selected, setSelected] = useState<Student | null>(null);
  const [examPoints, setExamPoints] = useState<ExamPoint[]>([]);
  const [examPointsLoading, setExamPointsLoading] = useState(false);
  const [examPointsLoaded, setExamPointsLoaded] = useState(false);
  const [selectedExamPoint, setSelectedExamPoint] = useState("");
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const searchTimeout = useRef<any>(null);

  // ── Search ──────────────────────────────────────────
  const searchStudents = useCallback(async (term: string) => {
    if (!term.trim() || term.trim().length < 2) {
      setStudents([]);
      setSearchError("");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const res = await fetch(`/api/erpnext?method=search&term=${encodeURIComponent(term.trim())}`);
      const data = await res.json();
      const inner = data.message || data;
      if (inner?.status === "success") {
        setStudents(inner.data || []);
        if ((inner.data || []).length === 0) setSearchError("لا يوجد طلاب بهذا الاسم");
      } else {
        setSearchError(inner?.message || data.error || "خطأ في الاتصال بـ ERPNext");
        setStudents([]);
      }
    } catch {
      setSearchError("تعذّر الاتصال بالسيرفر");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setSelected(null);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchStudents(val), 500);
  };

  // ── Select student ───────────────────────────────────
  const handleSelect = async (student: Student) => {
    setSelected(student);
    setSelectedExamPoint("");
    setUpdateSuccess(false);

    if (!examPointsLoaded) {
      setExamPointsLoading(true);
      try {
        const res = await fetch("/api/erpnext?method=exam_points");
        const data = await res.json();
        const inner = data.message || data;
        if (inner?.status === "success") {
          setExamPoints(inner.data || []);
          setExamPointsLoaded(true);
        }
      } catch { /* ignore */ }
      finally { setExamPointsLoading(false); }
    }
  };

  // ── Update exam point ────────────────────────────────
  const handleUpdate = async () => {
    if (!selected || !selectedExamPoint) return;
    setUpdating(true);
    setUpdateSuccess(false);
    try {
      const res = await fetch("/api/erpnext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_name_id: selected.name, new_exam_point: selectedExamPoint }),
      });
      const data = await res.json();
      const inner = data.message || data;
      if (inner?.status === "success") {
        setUpdateSuccess(true);
        // Update in list too
        const newEp = selectedExamPoint;
        setStudents(prev => prev.map(s => s.name === selected.name ? { ...s, exam_points: newEp } : s));
        setSelected(s => s ? { ...s, exam_points: newEp } : s);
      } else {
        alert(inner?.message || data.error || "فشل التحديث");
      }
    } catch {
      alert("خطأ في الاتصال");
    } finally {
      setUpdating(false);
    }
  };

  const currentEpLabel = examPoints.find(e => e.name === selected?.exam_points);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 28, margin: 0 }}>بحث الطلاب</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", margin: "6px 0 0", fontSize: 14 }}>
          ابحث عن طالب ← اختره ← عدّل قاعة الامتحان
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", gap: 0, marginBottom: 28, alignItems: "center" }}>
        {["البحث", "الاختيار", "التعديل"].map((label, i) => {
          const active = i === 0 ? true : i === 1 ? !!selected : !!selected;
          const done = i === 0 ? !!selected : i === 1 ? updateSuccess : false;
          const current = i === 0 ? !selected : i === 1 ? !!selected && !updateSuccess : updateSuccess;
          return (
            <React.Fragment key={i}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: done ? "#22c55e" : current ? "linear-gradient(135deg,#3b82f6,#6d28d9)" : "rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: active ? "#fff" : "rgba(255,255,255,0.3)",
                  fontWeight: 800, fontSize: 14,
                  transition: "all 0.3s",
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{ color: active ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 14 }}>{label}</span>
              </div>
              {i < 2 && <div style={{ flex: 1, height: 2, background: i < (selected ? 1 : 0) ? "#3b82f6" : "rgba(255,255,255,0.08)", margin: "0 12px", transition: "all 0.3s" }} />}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: 24, transition: "all 0.3s" }}>

        {/* LEFT — Search + Results */}
        <div>
          {/* Search input */}
          <div style={{
            display: "flex", alignItems: "center",
            background: "rgba(255,255,255,0.04)",
            border: "2px solid rgba(59,130,246,0.3)",
            borderRadius: 16, overflow: "hidden", marginBottom: 16,
          }}>
            <span style={{ padding: "0 16px", fontSize: 20 }}>{searching ? "⏳" : "🔍"}</span>
            <input
              type="text"
              placeholder="اكتب اسم الطالب..."
              value={searchTerm}
              onChange={handleSearchInput}
              style={{
                flex: 1, padding: "16px 0", background: "transparent",
                border: "none", outline: "none", color: "#fff",
                fontSize: 16, fontFamily: "inherit", direction: "rtl",
              }}
            />
            {searchTerm && (
              <button onClick={() => { setSearchTerm(""); setStudents([]); setSelected(null); setSearchError(""); }}
                style={{ padding: "0 16px", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 18 }}>✕</button>
            )}
          </div>

          {/* Error */}
          {searchError && !searching && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 12, color: "#fca5a5", fontSize: 14 }}>
              {searchError}
            </div>
          )}

          {/* Results list */}
          {students.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {students.map(student => {
                const isSelected = selected?.name === student.name;
                return (
                  <button
                    key={student.name}
                    onClick={() => handleSelect(student)}
                    style={{
                      width: "100%", textAlign: "right",
                      background: isSelected
                        ? "linear-gradient(135deg, rgba(59,130,246,0.2), rgba(109,40,217,0.15))"
                        : "rgba(255,255,255,0.03)",
                      border: `2px solid ${isSelected ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: 14, padding: "14px 18px", cursor: "pointer",
                      transition: "all 0.2s", color: "#fff", fontFamily: "inherit",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{student.student_name}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#93c5fd", fontFamily: "monospace" }}>🪪 {student.student_id}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>📍 {student.exam_points || "غير محددة"}</span>
                      {student.type_of_registration && (
                        <span style={{ fontSize: 12, color: "#c4b5fd", background: "rgba(139,92,246,0.12)", padding: "1px 8px", borderRadius: 50, border: "1px solid rgba(139,92,246,0.25)" }}>
                          {student.type_of_registration}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Prompt */}
          {students.length === 0 && !searching && !searchError && (
            <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(255,255,255,0.15)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
              <div>ابدأ بكتابة اسم الطالب</div>
            </div>
          )}
        </div>

        {/* RIGHT — Selected student detail + change exam point */}
        {selected && (
          <div style={{ animation: "slideIn 0.25s ease" }}>
            <div style={{
              background: "rgba(20,22,31,0.8)",
              border: "1px solid rgba(59,130,246,0.25)",
              borderRadius: 20, padding: "28px 24px",
              backdropFilter: "blur(16px)",
            }}>
              {/* Student info */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>الطالب المختار</div>
                <div style={{ color: "#fff", fontWeight: 800, fontSize: 20, marginBottom: 12 }}>{selected.student_name}</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span style={{
                    background: "rgba(59,130,246,0.12)", color: "#93c5fd",
                    border: "1px solid rgba(59,130,246,0.25)",
                    padding: "5px 14px", borderRadius: 50, fontSize: 13, fontWeight: 700, fontFamily: "monospace"
                  }}>🪪 {selected.student_id}</span>
                  {selected.type_of_registration && (
                    <span style={{
                      background: "rgba(139,92,246,0.12)", color: "#c4b5fd",
                      border: "1px solid rgba(139,92,246,0.25)",
                      padding: "5px 14px", borderRadius: 50, fontSize: 13, fontWeight: 600
                    }}>📋 {selected.type_of_registration}</span>
                  )}
                </div>
              </div>

              {/* Current exam point */}
              <div style={{
                background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 24
              }}>
                <div style={{ fontSize: 11, color: "#f59e0b", marginBottom: 4 }}>القاعة الحالية</div>
                <div style={{ color: "#fcd34d", fontWeight: 700, fontSize: 16 }}>
                  {currentEpLabel
                    ? `${currentEpLabel.title}${currentEpLabel.city ? ` — ${currentEpLabel.city}` : ""}`
                    : selected.exam_points || "غير محددة"}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 24 }} />

              {/* New exam point selector */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 10, fontWeight: 600 }}>
                  اختر القاعة الجديدة
                </div>
                <select
                  value={selectedExamPoint}
                  onChange={e => { setSelectedExamPoint(e.target.value); setUpdateSuccess(false); }}
                  disabled={examPointsLoading}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12, color: "#fff",
                    padding: "12px 16px", fontSize: 14,
                    cursor: "pointer", fontFamily: "inherit", direction: "rtl",
                    appearance: "none", outline: "none",
                  }}
                >
                  <option value="" disabled style={{ background: "#1a1c28" }}>
                    {examPointsLoading ? "جاري تحميل القاعات..." : "اختر قاعة..."}
                  </option>
                  {examPoints.map(ep => (
                    <option key={ep.name} value={ep.name} style={{ background: "#1a1c28" }}>
                      {ep.title || ep.name}{ep.city ? ` — ${ep.city}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Update button */}
              <button
                onClick={handleUpdate}
                disabled={!selectedExamPoint || updating || selectedExamPoint === selected.exam_points}
                style={{
                  width: "100%", padding: "14px 0",
                  background: updateSuccess
                    ? "linear-gradient(135deg,#22c55e,#15803d)"
                    : !selectedExamPoint || selectedExamPoint === selected.exam_points
                    ? "rgba(255,255,255,0.06)"
                    : "linear-gradient(135deg,#3b82f6,#6d28d9)",
                  border: "none", borderRadius: 14,
                  color: !selectedExamPoint || selectedExamPoint === selected.exam_points ? "rgba(255,255,255,0.3)" : "#fff",
                  fontWeight: 800, fontSize: 15, cursor: !selectedExamPoint ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                {updating ? "⏳ جاري التحديث..." : updateSuccess ? "✓ تم التحديث بنجاح" : "تحديث قاعة الامتحان"}
              </button>

              {updateSuccess && (
                <div style={{ textAlign: "center", marginTop: 12, color: "#86efac", fontSize: 13 }}>
                  تم تحديث قاعة الامتحان في نظام ERPNext
                </div>
              )}

              {/* Deselect */}
              <button onClick={() => { setSelected(null); setSelectedExamPoint(""); setUpdateSuccess(false); }}
                style={{ width: "100%", marginTop: 12, padding: "10px 0", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                إلغاء الاختيار
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        select option { background: #1a1c28; }
        button:hover:not(:disabled) { opacity: 0.9; }
      `}</style>
    </div>
  );
}
