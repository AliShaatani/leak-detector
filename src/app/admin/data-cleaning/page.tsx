"use client";

import React, { useState, useCallback } from "react";
import {
  Typography, Card, Space, Select, Button, Upload,
  Table, Tag, Flex, Divider, Tabs, Alert, Steps,
  Badge, Statistic, Row, Col, Tooltip, Empty, App, Spin, Switch
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FilterOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  UserOutlined,
  FileExcelOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Criterion {
  assessment_criteria: string;
  maximum_score: number;
}

interface Metadata {
  assessment_plan: string;
  student_group: string;
  course_name: string;
  course_code?: string;   // will be inferred if not returned
  criteria: Criterion[];
}

interface ResolvedRow {
  student_id: string;
  student_name: string;
  score: number;
  student_group: string;
  assessment_plan: string;
  docstatus?: number | null;
  _warning?: string;      // shown as a tooltip if group/plan not found
}

// ─── Score computation (mirrors bulk_api.py logic) ────────────────────────────

const FINAL_KEYWORDS = ["final", "finial", "النهائي", "score", "mark", "total_score", "total score"];
const MID_KEYWORDS = ["mid", "midterm", "نصفي"];
const ID_KEYWORDS = ["id", "student", "stundent", "roll", "number", "رقم القيد", "student_id"];

function extractStudentId(row: Record<string, any>): string {
  for (const k of Object.keys(row)) {
    if (ID_KEYWORDS.some((kw) => k.toLowerCase().includes(kw))) {
      return String(row[k] ?? "").trim();
    }
  }
  return "";
}

function computeScore(row: Record<string, any>, criteria: Criterion[]): number {
  let total = 0;
  for (const c of criteria) {
    const cLow = c.assessment_criteria.toLowerCase().trim();
    let val: number | null = null;
    for (const [k, v] of Object.entries(row)) {
      const kLow = k.toLowerCase().trim();
      const match =
        kLow === cLow ||
        kLow.includes(cLow) ||
        (FINAL_KEYWORDS.some((f) => kLow.includes(f)) && FINAL_KEYWORDS.some((f) => cLow.includes(f))) ||
        (MID_KEYWORDS.some((m) => kLow.includes(m)) && MID_KEYWORDS.some((m) => cLow.includes(m)));
      if (match && v !== null && String(v).trim() !== "") {
        val = Math.min(parseFloat(String(v)) || 0, c.maximum_score);
        break;
      }
    }
    if (val !== null) total += val;
  }
  return parseFloat(total.toFixed(2));
}

function extractRawScore(row: Record<string, any>): number {
  const scoreKeywords = ["النهائي", "الدرجة", "final", "score", "mark", "total_score", "total score", "total"];
  for (const k of Object.keys(row)) {
    const kLow = k.toLowerCase().trim();
    if (scoreKeywords.some((kw) => kLow === kw || kLow.includes(kw))) {
      const v = row[k];
      if (v !== null && String(v).trim() !== "") {
        return parseFloat(String(v)) || 0;
      }
    }
  }
  return 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataCleaningPage() {
  const { message: appMessage } = App.useApp();

  // ── state ──
  const [plans, setPlans] = useState<{ value: string; label: string }[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);

  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [fileName, setFileName] = useState<string>("");

  const [processing, setProcessing] = useState(false);
  const [matched, setMatched] = useState<ResolvedRow[]>([]);
  const [others, setOthers] = useState<ResolvedRow[]>([]);
  const [done, setDone] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // ── step tracking (0-indexed) ──
  const currentStep =
    !selectedPlan ? 0 :
      !metadata ? 0 :
        rawRows.length === 0 ? 1 :
          !done ? 2 : 3;

  // ── plan search ──
  const searchPlans = async (term: string) => {
    try {
      const res = await fetch(`/api/erpnext/bulk?method=search_plans&term=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlans(data.map((p: any) => ({
          value: p.value,
          label: p.value + (p.description ? ` - ${p.description}` : ""),
        })));
      }
    } catch { /* silent */ }
  };

  // ── fetch metadata ──
  const fetchMetadata = async (plan: string) => {
    setMetaLoading(true);
    setMetadata(null);
    setRawRows([]);
    setDone(false);
    setMatched([]);
    setOthers([]);
    try {
      const res = await fetch(`/api/erpnext/bulk?method=metadata&assessment_plan=${plan}`);
      const data = await res.json();
      if (res.ok) {
        setMetadata(data); // data now includes course_code from ERPNext
      } else {
        appMessage.error(data.error || "فشل في جلب بيانات خطة التقييم");
      }
    } catch {
      appMessage.error("فشل الاتصال بالخادم");
    } finally {
      setMetaLoading(false);
    }
  };

  // ── file parse ──
  const handleFile = useCallback((file: File) => {
    setDone(false);
    setMatched([]);
    setOthers([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws);
        setRawRows(rows);
        setFileName(file.name);
      } catch {
        appMessage.error("فشل قراءة ملف Excel");
      }
    };
    reader.readAsBinaryString(file);
    return false; // prevent default upload
  }, [appMessage]);

  // ── main processing logic ──
  const process = async () => {
    if (!metadata || rawRows.length === 0 || !selectedPlan) return;

    setProcessing(true);
    setDone(false);

    try {
      // 1. Fetch group students for the selected plan
      const studentsRes = await fetch(
        `/api/erpnext/bulk?method=all_students&assessment_plan=${selectedPlan}&student_group=${encodeURIComponent(metadata.student_group)}`
      );
      const groupStudents: any[] = studentsRes.ok ? await studentsRes.json() : [];

      // Build a set of numeric_ids present in the original group
      const groupNumericIds = new Set<string>(
        groupStudents.map((s: any) => String(s.numeric_id || "").trim()).filter(Boolean)
      );

      // 2. Split raw rows
      const matchedRows: ResolvedRow[] = [];
      const unmatchedIds: string[] = [];
      const unmatchedScores: Record<string, number> = {};

      for (const row of rawRows) {
        const sid = extractStudentId(row);
        if (!sid) continue;
        const score = computeScore(row, metadata.criteria);

        if (groupNumericIds.has(sid)) {
          // Find the erp_name to get the student name
          const studentRec = groupStudents.find((s: any) => String(s.numeric_id || "").trim() === sid);
          matchedRows.push({
            student_id: sid,
            student_name: studentRec?.student_name || "",
            score,
            student_group: metadata.student_group,
            assessment_plan: selectedPlan,
            docstatus: studentRec?.docstatus !== undefined ? studentRec.docstatus : null,
          });
        } else {
          unmatchedIds.push(sid);
          unmatchedScores[sid] = score;
        }
      }

      setMatched(matchedRows);

      // 3. Batch-resolve unmatched students
      if (unmatchedIds.length > 0) {
        const courseCode = metadata.course_code || metadata.course_name;

        const batchRes = await fetch("/api/erpnext/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "batch_resolve",
            student_ids: unmatchedIds,
            course: courseCode,
          }),
        });

        const batchData: any[] = batchRes.ok ? await batchRes.json() : [];

        const othersRows: ResolvedRow[] = batchData.map((r: any) => {
          const row = rawRows.find((row) => extractStudentId(row) === r.student_id) || {};
          const score = r.criteria && r.criteria.length > 0 
            ? computeScore(row, r.criteria) 
            : extractRawScore(row);
          return {
            student_id: r.student_id,
            student_name: r.student_name || "",
            score,
            student_group: r.student_group || "غير موجود",
            assessment_plan: r.assessment_plan || "غير موجود",
            docstatus: r.docstatus !== undefined ? r.docstatus : null,
            _warning: !r.student_group
              ? "لم يُعثر على مجموعة نشطة لهذا الطالب"
              : !r.assessment_plan
                ? "لم يُعثر على خطة تقييم لهذه المجموعة والمقرر"
                : undefined,
          };
        });

        setOthers(othersRows);
      } else {
        setOthers([]);
      }

      setDone(true);
      appMessage.success("تمت المعالجة بنجاح");
    } catch (err: any) {
      appMessage.error("حدث خطأ أثناء المعالجة: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ── export ──
  const exportExcel = () => {
    if (!done) return;

    const wb = XLSX.utils.book_new();

    // Helper: convert matched rows to matched sheet (student_id, score, status)
    const toMatchSheet = (rows: ResolvedRow[]) =>
      XLSX.utils.json_to_sheet(
        rows.map((r) => {
          let statusText = "غير مرصودة";
          if (r.docstatus === 1) statusText = "مرصودة معتمدة";
          else if (r.docstatus === 0) statusText = "مسودة غير معتمدة";

          return {
            student_id: r.student_id,
            score: r.score,
            "حالة الرصد": statusText,
          };
        })
      );

    // Helper: convert rows to sheet with all fields
    const toSheet = (rows: ResolvedRow[]) =>
      XLSX.utils.json_to_sheet(
        rows.map((r, index) => {
          let statusText = "غير مرصودة";
          if (r.docstatus === 1) statusText = "مرصودة معتمدة";
          else if (r.docstatus === 0) statusText = "مسودة غير معتمدة";

          return {
            "#": index + 1,
            "رقم القيد": r.student_id,
            "اسم الطالب": r.student_name || "",
            "الدرجة": r.score,
            "حالة الرصد": statusText,
            "مجموعة الطلاب": r.student_group || "",
            "خطة التقييم": r.assessment_plan || "",
          };
        })
      );

    // Sheet 1: matched students → original assessment plan
    if (matched.length > 0) {
      const sheetName = (selectedPlan || "Matched").slice(0, 31); // Excel limit: 31 chars
      XLSX.utils.book_append_sheet(wb, toMatchSheet(matched), sheetName);
    }

    // Sheets for "others": one sheet per unique assessment plan
    const byPlan: Record<string, ResolvedRow[]> = {};
    for (const r of others) {
      const key = r.assessment_plan || "غير موجود";
      if (!byPlan[key]) byPlan[key] = [];
      byPlan[key].push(r);
    }
    for (const [planName, rows] of Object.entries(byPlan)) {
      const sheetName = planName.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, toSheet(rows), sheetName);
    }

    XLSX.writeFile(wb, `cleaned_${selectedPlan || "output"}.xlsx`);
  };

  // ── table columns ──
  const columns: ColumnsType<ResolvedRow> = [
    {
      title: "#",
      key: "idx",
      width: 55,
      align: "center",
      render: (_: any, __: any, i: number) => <Text type="secondary" style={{ fontSize: 12 }}>{i + 1}</Text>,
    },
    {
      title: "رقم القيد",
      dataIndex: "student_id",
      key: "student_id",
      width: 120,
      sorter: (a, b) => a.student_id.localeCompare(b.student_id),
    },
    {
      title: "اسم الطالب",
      dataIndex: "student_name",
      key: "student_name",
      ellipsis: true,
      sorter: (a, b) => a.student_name.localeCompare(b.student_name),
      render: (name: string, record: ResolvedRow) => (
        <Flex align="center" gap={6}>
          {record._warning && (
            <Tooltip title={record._warning}>
              <ExclamationCircleOutlined style={{ color: "#fa8c16" }} />
            </Tooltip>
          )}
          {name || <Text type="secondary">غير معروف</Text>}
        </Flex>
      ),
    },
    {
      title: "الدرجة",
      dataIndex: "score",
      key: "score",
      width: 90,
      align: "center",
      sorter: (a, b) => a.score - b.score,
      render: (s: number) => <Text strong style={{ color: s > 0 ? "var(--accent)" : undefined }}>{s}</Text>,
    },
    {
      title: "حالة الرصد",
      key: "status",
      width: 140,
      align: "center",
      render: (_: any, record: ResolvedRow) => {
        if (record.docstatus === 1) {
          return <Tag color="success">مرصودة معتمدة</Tag>;
        } else if (record.docstatus === 0) {
          return <Tag color="warning">مسودة غير معتمدة</Tag>;
        } else {
          return <Tag color="default">غير مرصودة</Tag>;
        }
      }
    },
    {
      title: "مجموعة الطلاب",
      dataIndex: "student_group",
      key: "student_group",
      ellipsis: true,
      render: (g: string) =>
        g === "غير موجود"
          ? <Tag color="error">{g}</Tag>
          : <Tag color="blue" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>{g}</Tag>,
    },
    {
      title: "خطة التقييم",
      dataIndex: "assessment_plan",
      key: "assessment_plan",
      ellipsis: true,
      render: (ap: string) =>
        ap === "غير موجود"
          ? <Tag color="error">{ap}</Tag>
          : <Tag color="green">{ap}</Tag>,
    },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade" dir="rtl">
      <Flex vertical gap={28}>

        {/* ── Header ── */}
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 900 }}>تنظيف البيانات</Title>
            <Text type="secondary">
              فصل وتصنيف الطلاب المختلطين من ملف Excel وتحديد خطة التقييم لكل مجموعة.
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            disabled={!done}
            onClick={exportExcel}
            style={{ borderRadius: 12, padding: "0 28px" }}
          >
            تصدير Excel النهائي
          </Button>
        </Flex>

        {/* ── Steps ── */}
        <Card bordered={false} className="glass" style={{ borderRadius: 20 }}>
          <Steps
            current={currentStep}
            size="small"
            items={[
              { title: "اختر خطة التقييم", icon: <SearchOutlined /> },
              { title: "ارفع الملف المختلط", icon: <CloudUploadOutlined /> },
              { title: "تحليل وتصنيف", icon: <FilterOutlined /> },
              { title: "تصدير النتيجة", icon: <DownloadOutlined /> },
            ]}
          />
        </Card>

        {/* ── Controls ── */}
        <Card bordered={false} className="glass" style={{ borderRadius: 20 }}>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>

            {/* Plan selector + upload */}
            <Flex gap={16} align="flex-end" wrap="wrap">
              <div style={{ flex: 1, minWidth: 260 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>كود الامتحان (Assessment Plan)</Text>
                <Select
                  showSearch
                  placeholder="ابحث عن الكود..."
                  style={{ width: "100%" }}
                  size="large"
                  loading={metaLoading}
                  filterOption={false}
                  onSearch={searchPlans}
                  onSelect={(val) => {
                    setSelectedPlan(val);
                    fetchMetadata(val);
                  }}
                  options={plans}
                />
              </div>

              <Upload
                accept=".xlsx,.xls,.csv"
                beforeUpload={handleFile}
                showUploadList={false}
                disabled={!metadata || metaLoading}
              >
                <Button
                  size="large"
                  icon={<FileExcelOutlined />}
                  disabled={!metadata || metaLoading}
                  style={{ borderRadius: 12 }}
                >
                  {fileName ? fileName : "رفع ملف Excel المختلط"}
                </Button>
              </Upload>

              <Button
                type="primary"
                size="large"
                icon={processing ? <SyncOutlined spin /> : <FilterOutlined />}
                disabled={!metadata || rawRows.length === 0 || processing}
                loading={processing}
                onClick={process}
                style={{ borderRadius: 12, padding: "0 28px" }}
              >
                تحليل الملف
              </Button>
            </Flex>

            {/* Metadata strip */}
            {metadata && (
              <Flex
                gap={24}
                wrap="wrap"
                style={{
                  background: "var(--elevated)",
                  padding: "14px 22px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  animation: "slideDown 0.4s ease-out",
                }}
              >
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>المقرر</Text>
                  <Text strong style={{ display: "block" }}>{metadata.course_name}</Text>
                </div>
                <Divider type="vertical" style={{ height: 38 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>المجموعة الأصلية</Text>
                  <Text strong style={{ display: "block" }}>{metadata.student_group}</Text>
                </div>
                <Divider type="vertical" style={{ height: 38 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>معايير التقييم</Text>
                  <Text strong style={{ display: "block" }}>{metadata.criteria.length} معيار</Text>
                </div>
                {rawRows.length > 0 && (
                  <>
                    <Divider type="vertical" style={{ height: 38 }} />
                    <div>
                      <Text type="secondary" style={{ fontSize: 11 }}>سجلات الملف</Text>
                      <Text strong style={{ display: "block" }}>{rawRows.length} صف</Text>
                    </div>
                  </>
                )}
              </Flex>
            )}
          </Space>
        </Card>

        {/* ── Results ── */}
        {processing && (
          <Card bordered={false} className="glass" style={{ borderRadius: 20, textAlign: "center", padding: 40 }}>
            <Spin size="large" tip="جاري تحليل الطلاب..." />
          </Card>
        )}

        {done && !processing && (
          <>
            {/* Stats */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Card bordered={false} className="glass" style={{ borderRadius: 16 }}>
                  <Statistic
                    title="الطلاب المطابقون"
                    value={matched.length}
                    prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                    valueStyle={{ color: "#52c41a" }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    موجودون في مجموعة خطة التقييم المختارة
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card bordered={false} className="glass" style={{ borderRadius: 16 }}>
                  <Statistic
                    title="طلاب مجموعات أخرى"
                    value={others.length}
                    prefix={<TeamOutlined style={{ color: "#1677ff" }} />}
                    valueStyle={{ color: "#1677ff" }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    تم تحديد مجموعاتهم وخطط تقييمهم
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card bordered={false} className="glass" style={{ borderRadius: 16 }}>
                  <Statistic
                    title="إجمالي المعالجة"
                    value={matched.length + others.length}
                    prefix={<UserOutlined />}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>من إجمالي {rawRows.length} صف في الملف</Text>
                </Card>
              </Col>
            </Row>

            {/* Warnings for unresolved */}
            {others.some((r) => r._warning) && (
              <Alert
                type="warning"
                showIcon
                message="بعض الطلاب لم يُعثر على مجموعتهم أو خطة تقييمهم"
                description="تحقق من الصفوف التي تحمل أيقونة التحذير في جدول الطلاب الآخرين."
              />
            )}

            <Card bordered={false} className="glass" style={{ borderRadius: 20 }}>
              <Tabs
                defaultActiveKey="matched"
                size="large"
                tabBarExtraContent={
                  <Space style={{ paddingLeft: 12 }}>
                    <Text style={{ fontSize: 13 }}>عرض الكل</Text>
                    <Switch
                      checked={showAll}
                      onChange={setShowAll}
                      size="small"
                      checkedChildren="نعم"
                      unCheckedChildren="لا"
                    />
                  </Space>
                }
                items={[
                  {
                    key: "matched",
                    label: (
                      <span>
                        الطلاب المطابقون&nbsp;
                        <Badge count={matched.length} overflowCount={99999} style={{ background: "#52c41a" }} />
                      </span>
                    ),
                    children: (
                      <Table
                        columns={columns}
                        dataSource={matched.map((r, i) => ({ ...r, key: i }))}
                        bordered
                        size="middle"
                        pagination={showAll ? false : { defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ["20", "50", "100"] }}
                        style={{ borderRadius: 16, overflow: "hidden" }}
                        locale={{ emptyText: <Empty description="لا يوجد طلاب مطابقون" /> }}
                      />
                    ),
                  },
                  {
                    key: "others",
                    label: (
                      <span>
                        طلاب مجموعات أخرى&nbsp;
                        <Badge count={others.length} overflowCount={99999} style={{ background: "#1677ff" }} />
                      </span>
                    ),
                    children: (
                      <Table
                        columns={columns}
                        dataSource={others.map((r, i) => ({ ...r, key: i }))}
                        bordered
                        size="middle"
                        pagination={showAll ? false : { defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ["20", "50", "100"] }}
                        style={{ borderRadius: 16, overflow: "hidden" }}
                        locale={{ emptyText: <Empty description="لا يوجد طلاب من مجموعات أخرى" /> }}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </>
        )}

      </Flex>

      <style jsx global>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
