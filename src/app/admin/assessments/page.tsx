"use client";

import React, { useState, useEffect } from "react";
import {
  Typography, Card, Space, Select, Table, Button,
  Upload, Switch, Tag, Alert, Progress, message,
  Flex, Divider, Badge, Modal, Empty, App, Dropdown
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  UploadOutlined,
  SearchOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
  CopyOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  FileExcelOutlined
} from "@ant-design/icons";
import * as XLSX from "xlsx";

const { Title, Text } = Typography;

interface Criterion {
  assessment_criteria: string;
  maximum_score: number;
}

interface Student {
  student: string;
  student_name: string;
  numeric_id?: string;
  assessment_details: Record<string, [number | string, string]> | null;
  docstatus: number;
}

interface Metadata {
  course_code: string;
  course_name: string;
  student_group: string;
  criteria: Criterion[];
}

export default function BulkAssessmentPage() {
  const { modal, message: appMessage } = App.useApp();
  const [loading, setLoading]           = useState(false);
  const [plans, setPlans]               = useState<{ value: string; label: string }[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [metadata, setMetadata]         = useState<Metadata | null>(null);
  const [students, setStudents]         = useState<Student[]>([]);
  const [localParsing, setLocalParsing] = useState(true);
  const [errorData, setErrorData]       = useState<any[] | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [zeroMissing, setZeroMissing]   = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [showAll, setShowAll]             = useState(false);
  const [currentUser, setCurrentUser]   = useState<string>("غير معروف");

  // Load current admin user name once on mount
  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
    if (!userId) return;
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(d => { if (d?.name) setCurrentUser(d.name); })
      .catch(() => {});
  }, []);

  // Fire-and-forget: record a successful operation in the local DB
  const saveLog = (operationType: string, submittedCount: number) => {
    if (!selectedPlan || !metadata) return;
    fetch("/api/assessment-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assessmentPlan: selectedPlan,
        courseName:     metadata.course_name,
        studentGroup:   metadata.student_group,
        submittedCount,
        operationType,
        performedBy:    currentUser,
      }),
    }).catch(() => {}); // silent — logging should never break the main flow
  };

  const searchPlans = async (term: string) => {
    try {
      const res = await fetch(`/api/erpnext/bulk?method=search_plans&term=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlans(data.map(p => ({ value: p.value, label: p.value + (p.description ? ` - ${p.description}` : '') })));
      }
    } catch (err) {
      console.error("فشل البحث", err);
    }
  };

  const fetchMetadata = async (plan: string) => {
    setLoading(true);
    setMetadata(null);
    setStudents([]);
    try {
      const res = await fetch(`/api/erpnext/bulk?method=metadata&assessment_plan=${plan}`);
      const data = await res.json();
      if (res.ok) {
        setMetadata(data);
        fetchStudents(plan, data.student_group);
      } else {
        appMessage.error(data.error || "فشل في جلب البيانات الوصفية");
      }
    } catch (err) {
      appMessage.error("فشل الطلب");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (plan: string, group: string) => {
    try {
      const res = await fetch(`/api/erpnext/bulk?method=students&assessment_plan=${plan}&student_group=${group}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bstr = e.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        processScores(data);
      } catch (err) {
        appMessage.error("فشل في تحليل ملف Excel");
      }
    };
    reader.readAsBinaryString(file);
    return false;
  };

  const printCertifiedSheetPdf = () => {
    if (!selectedPlan || !metadata) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      appMessage.error("يرجى السماح بفتح النوافذ المنبثقة لطباعة الكشف");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>كشف درجات معتمد - ${selectedPlan}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          body {
            font-family: 'Cairo', sans-serif;
            direction: rtl;
            padding: 30px;
            margin: 0;
            background: #fff;
            color: #000;
          }
          .header-container {
            text-align: center;
            margin-bottom: 25px;
          }
          .logo {
            max-height: 75px;
            display: block;
            margin: 0 auto 15px auto;
          }
          .doc-title {
            font-size: 22px;
            font-weight: 900;
            margin: 10px 0;
            border-bottom: 2px double #000;
            display: inline-block;
            padding-bottom: 5px;
          }
          .info-grid {
            display: table;
            width: 100%;
            margin-bottom: 25px;
            border: 1px solid #000;
            border-collapse: collapse;
          }
          .info-row {
            display: table-row;
          }
          .info-cell {
            display: table-cell;
            border: 1px solid #000;
            padding: 10px 15px;
            font-size: 13px;
            width: 50%;
            text-align: right;
          }
          .info-label {
            font-weight: 900;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 40px;
          }
          th, td {
            border: 1px solid #000;
            padding: 10px 8px;
            text-align: center;
            font-size: 13px;
          }
          th {
            background-color: #f5f5f5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            font-weight: 900;
          }
          tr:nth-child(even) td {
            background-color: #fafafa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .signatures-container {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            padding: 0 50px;
            page-break-inside: avoid;
          }
          .signature-box {
            text-align: center;
            width: 200px;
            font-size: 14px;
            font-weight: 700;
          }
          .signature-line {
            margin-top: 45px;
            border-top: 1px dashed #000;
            padding-top: 5px;
            font-size: 11px;
            font-weight: 400;
            color: #666;
          }
          @media print {
            body {
              padding: 15px;
            }
            @page {
              size: A4;
              margin: 1.5cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <img src="/logo-black.png" alt="Logo" class="logo" />
          <h1 class="doc-title">كشف درجات معتمد</h1>
        </div>
        
        <div class="info-grid">
          <div class="info-row">
            <div class="info-cell">
              <span class="info-label">كود الامتحان:</span> ${selectedPlan}
            </div>
            <div class="info-cell">
              <span class="info-label">اسم المقرر:</span> ${metadata.course_name}
            </div>
          </div>
          <div class="info-row">
            <div class="info-cell">
              <span class="info-label">مجموعة الطلاب:</span> ${metadata.student_group}
            </div>
            <div class="info-cell">
              <span class="info-label">عدد الطلاب:</span> ${students.length} طالب
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 60px;">#</th>
              <th style="width: 150px;">رقم القيد</th>
              <th>اسم الطالب</th>
              <th style="width: 120px;">الدرجة</th>
            </tr>
          </thead>
          <tbody>
            ${students.map((s, index) => {
              const scoreVal = s.assessment_details?.["total_score"]?.[0];
              const displayScore = (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") ? scoreVal : "null";
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${s.numeric_id || s.student}</td>
                  <td style="text-align: right; padding-right: 15px;">${s.student_name}</td>
                  <td style="font-weight: bold;">${displayScore}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <div class="signatures-container">
          <div class="signature-box">
            <div>رئيس لجنة الرصد</div>
            <div class="signature-line">التوقيع</div>
          </div>
          <div class="signature-box">
            <div>عميد الكلية</div>
            <div class="signature-line">التوقيع</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const exportCertifiedSheetExcel = () => {
    if (!selectedPlan || !metadata) return;

    const wb = XLSX.utils.book_new();

    const aoaData: any[][] = [
      ["كشف درجات معتمد"],
      [],
      ["كود الامتحان:", selectedPlan],
      ["المقرر:", metadata.course_name],
      ["مجموعة الطلاب:", metadata.student_group],
      ["عدد الطلاب:", `${students.length} طالب`],
      [],
      ["#", "رقم القيد", "اسم الطالب", "الدرجة"]
    ];

    students.forEach((s, index) => {
      const scoreVal = s.assessment_details?.["total_score"]?.[0];
      const displayScore = (scoreVal !== undefined && scoreVal !== null && scoreVal !== "") ? scoreVal : "null";
      aoaData.push([
        index + 1,
        s.numeric_id || s.student,
        s.student_name,
        displayScore === "null" ? "null" : parseFloat(String(displayScore)) || 0
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoaData);

    ws["!cols"] = [
      { wch: 8 },  // #
      { wch: 15 }, // رقم القيد
      { wch: 35 }, // اسم الطالب
      { wch: 12 }  // الدرجة
    ];

    XLSX.utils.book_append_sheet(wb, ws, "كشف درجات معتمد");
    XLSX.writeFile(wb, `certified_grades_${selectedPlan}.xlsx`);
  };

  const processScores = async (scores: any[]) => {
    if (!selectedPlan) return;
    setUploading(true);
    setErrorData(null);

    try {
      const res = await fetch("/api/erpnext/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "process_json",
          assessment_plan: selectedPlan,
          scores_data: scores,
          zero_missing: zeroMissing ? 1 : 0
        })
      });

      const data = await res.json();
      if (data.status === "success") {
        appMessage.success(`تمت رصد ${data.processed_count} درجة بنجاح`);
        saveLog("excel", data.processed_count);
        fetchStudents(selectedPlan, metadata!.student_group);
      } else if (data.status === "error") {
        if (data.missing_students) {
          setErrorData(data.missing_students);
          modal.error({
            title: "فشل التحقق: طلاب مفقودون",
            content: "يحتوي الملف المرفوع على طلاب لا ينتمون لمجموعة الطلاب المختارة. يرجى اضافتهم قبل اعادة المحاوله.",
            width: 600,
            okText: "حسناً",
            icon: <ExclamationCircleOutlined color="#ff4d4f" />
          });
        } else {
          appMessage.error(data.message || "فشل في معالجة الدرجات");
        }
      }
    } catch (err) {
      appMessage.error("فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleZeroDrafts = () => {
    if (!selectedPlan || !metadata) return;

    const drafts = students.filter(s => s.docstatus !== 1);
    if (drafts.length === 0) {
      appMessage.info("لا يوجد طلاب بوضعية مسودة لتصفيرهم.");
      return;
    }

    modal.confirm({
      title: "تصفير المسودات",
      content: `هل أنت متأكد من رصد 0 درجة لـ ${drafts.length} طالب (حالتهم مسودة)؟ سيتم اعتبارهم غائبين.`,
      okText: "نعم، تصفير",
      okType: "danger",
      cancelText: "إلغاء",
      onOk: async () => {
        setUploading(true);
        try {
          // Build zero-score payload using ERPNext student name directly.
          // Each entry matches what mark_assessment_result expects:
          // { student, assessment_details: { criteria_name: 0, ... }, total_score, comment }
          const scores_data = drafts.map(s => {
            const assessment_details: Record<string, number> = {};
            metadata!.criteria.forEach(c => {
              assessment_details[c.assessment_criteria] = 0;
            });
            return {
              student: s.student,
              assessment_details,
              total_score: 0,
              comment: "تصفير يدوي (مسودة)"
            };
          });

          const res = await fetch("/api/erpnext/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "zero_drafts",
              assessment_plan: selectedPlan,
              student_group: metadata!.student_group,
              scores_data
            })
          });

          const data = await res.json();
          if (data.status === "success") {
            appMessage.success(`تم تصفير ${data.processed_count} طالب بنجاح`);
            saveLog("zero_drafts", data.processed_count);
            fetchStudents(selectedPlan!, metadata!.student_group);
          } else {
            appMessage.error(data.message || "فشل التصفير");
          }
        } catch (err) {
          appMessage.error("فشل الطلب");
        } finally {
          setUploading(false);
        }
      }
    });
  };

  const copyColumn = (data: any[], dataIndex: string | ((item: any) => string), title: string) => {
    const text = data.map(item => typeof dataIndex === 'function' ? dataIndex(item) : (item[dataIndex] || "")).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      appMessage.success(`تم نسخ ${title}`);
    });
  };

  const columns: ColumnsType<Student> = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{index + 1}</Text>
      )
    },
    {
      title: (
        <Flex justify="space-between" align="center">
          <span>رقم القيد</span>
          <CopyOutlined 
            onClick={(e) => { e.stopPropagation(); copyColumn(students, (s) => s.numeric_id || s.student, "رقم القيد"); }} 
            style={{ cursor: "pointer", opacity: 0.5 }} 
          />
        </Flex>
      ),
      dataIndex: "numeric_id",
      key: "numeric_id",
      width: 120,
      sorter: (a: Student, b: Student) => (a.numeric_id || a.student).localeCompare(b.numeric_id || b.student),
      render: (id: string, record: Student) => id || <Text type="secondary">{record.student}</Text>
    },
    {
      title: (
        <Flex justify="space-between" align="center">
          <span>اسم الطالب</span>
          <CopyOutlined 
            onClick={(e) => { e.stopPropagation(); copyColumn(students, "student_name", "اسم الطالب"); }} 
            style={{ cursor: "pointer", opacity: 0.5 }} 
          />
        </Flex>
      ),
      dataIndex: "student_name",
      key: "student_name",
      ellipsis: true,
      sorter: (a: Student, b: Student) => a.student_name.localeCompare(b.student_name),
    },
    ...(metadata?.criteria || []).map(c => ({
      title: (
        <Flex justify="space-between" align="center">
          <span>{`${c.assessment_criteria} (/${c.maximum_score})`}</span>
          <CopyOutlined 
            onClick={(e) => { e.stopPropagation(); copyColumn(students, (s) => String(s.assessment_details?.[c.assessment_criteria]?.[0] || ""), c.assessment_criteria); }} 
            style={{ cursor: "pointer", opacity: 0.5 }} 
          />
        </Flex>
      ),
      key: c.assessment_criteria,
      sorter: (a: Student, b: Student) => {
        const scoreA = Number(a.assessment_details?.[c.assessment_criteria]?.[0]) || 0;
        const scoreB = Number(b.assessment_details?.[c.assessment_criteria]?.[0]) || 0;
        return scoreA - scoreB;
      },
      render: (_: any, record: Student) => {
        const detail = record.assessment_details?.[c.assessment_criteria];
        if (!detail) return <Text type="secondary">-</Text>;
        const [score, grade] = detail;
        return (
          <Space>
            <Text strong>{score}</Text>
            {grade && <Tag color="blue" style={{ fontSize: 10 }}>{grade}</Tag>}
          </Space>
        );
      }
    })),
    {
      title: (
        <Flex justify="space-between" align="center">
          <span>الحالة</span>
          <CopyOutlined 
            onClick={(e) => { e.stopPropagation(); copyColumn(students, (s) => s.docstatus === 1 ? "تم الرصد" : "مسودة", "الحالة"); }} 
            style={{ cursor: "pointer", opacity: 0.5 }} 
          />
        </Flex>
      ),
      dataIndex: "docstatus",
      key: "status",
      width: 130,
      filters: [
        { text: "تم الرصد", value: 1 },
        { text: "مسودة", value: 0 },
      ],
      onFilter: (value: any, record: Student) => String(record.docstatus) === String(value),
      sorter: (a: Student, b: Student) => (Number(a.docstatus) || 0) - (Number(b.docstatus) || 0),
      render: (status: number) => (
        status === 1
          ? <Tag color="success">تم الرصد</Tag>
          : <Tag color="warning">مسودة</Tag>
      )
    }
  ];

  return (
    <div className="animate-fade" dir="rtl">
      <Flex vertical gap={24}>
        <Flex justify="space-between" align="center">
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 900 }}>الرصد الجماعي للدرجات</Title>
            <Text type="secondary">استيراد والتحقق من درجات الطلاب من ملفات خارجية.</Text>
          </div>
          <Space size={20}>
            <Space>
              <Text style={{ fontSize: 13 }}>تصفير الطلاب المفقودين</Text>
              <Switch
                checked={zeroMissing}
                onChange={setZeroMissing}
                size="small"
                checkedChildren="نعم"
                unCheckedChildren="لا"
              />
            </Space>
            <Divider type="vertical" />
            <Space>
              <Text style={{ fontSize: 13 }}>عرض الكل</Text>
              <Switch
                checked={showAll}
                onChange={setShowAll}
                size="small"
                checkedChildren="نعم"
                unCheckedChildren="لا"
              />
            </Space>
            <Divider type="vertical" />
            <Button 
              type="primary"
              danger
              icon={<CheckCircleOutlined />} 
              onClick={handleZeroDrafts}
              disabled={!selectedPlan || students.filter(s => s.docstatus !== 1).length === 0}
            >
              تصفير المسودات
            </Button>
            <Button
              type="dashed"
              icon={<SearchOutlined />}
              onClick={() => selectedPlan && fetchStudents(selectedPlan, metadata!.student_group)}
              disabled={!selectedPlan}
            >
              تحديث الدرجات
            </Button>
            <Dropdown
              disabled={!selectedPlan || students.length === 0}
              menu={{
                items: [
                  {
                    key: "pdf",
                    label: "تحميل PDF / طباعة",
                    icon: <FilePdfOutlined style={{ color: "#ff4d4f" }} />,
                    onClick: printCertifiedSheetPdf,
                  },
                  {
                    key: "excel",
                    label: "تحميل Excel",
                    icon: <FileExcelOutlined style={{ color: "#52c41a" }} />,
                    onClick: exportCertifiedSheetExcel,
                  },
                ],
              }}
            >
              <Button 
                type="primary" 
                style={{ background: "#52c41a", borderColor: "#52c41a" }} 
                icon={<PrinterOutlined />}
              >
                كشف درجات معتمد
              </Button>
            </Dropdown>
          </Space>
        </Flex>

        <Card bordered={false} className="glass" style={{ borderRadius: 24 }}>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Flex gap={16} align="flex-end">
              <div style={{ flex: 1 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>اختر كود الامتحان</Text>
                <Select
                  showSearch
                  placeholder="ابحث عن الكود..."
                  style={{ width: "100%" }}
                  size="large"
                  loading={loading}
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
                accept=".xlsx, .xls, .csv"
                beforeUpload={handleFileUpload}
                showUploadList={false}
                disabled={!selectedPlan || uploading}
              >
                <Button
                  type="primary"
                  size="large"
                  icon={<CloudUploadOutlined />}
                  loading={uploading}
                  disabled={!selectedPlan}
                  style={{ borderRadius: 12, padding: "0 30px" }}
                >
                  رفع ملف اكسل
                </Button>
              </Upload>
            </Flex>

            {metadata && (
              <Flex gap={24} className="metadata-strip" style={{
                background: "var(--elevated)",
                padding: "16px 24px",
                borderRadius: 16,
                border: "1px solid var(--border)"
              }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>المقرر</Text>
                  <Text strong style={{ display: "block" }}>{metadata.course_name}</Text>
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>مجموعة الطلاب</Text>
                  <Text strong style={{ display: "block" }}>{metadata.student_group}</Text>
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>المسجلون</Text>
                  <Text strong style={{ display: "block" }}>{students.length} طالب</Text>
                </div>
              </Flex>
            )}
          </Space>
        </Card>

        {errorData && (
          <Alert
            message="أخطاء في التحقق"
            description={
              <Space direction="vertical" style={{ width: "100%", marginTop: 10 }}>
                <Flex justify="space-between" align="center">
                  <Text>السجلات التالية في ملفك لم يتم معالجتها:</Text>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setShowAllErrors(!showAllErrors)}
                    style={{ padding: 0 }}
                  >
                    {showAllErrors ? "عرض الصفحات" : "عرض الكل"}
                  </Button>
                </Flex>
                <Table
                  dataSource={errorData.map((err, i) => ({ ...err, key: i }))}
                  columns={[
                    {
                      title: (
                        <Flex justify="space-between" align="center">
                          <span>الرقم</span>
                          <CopyOutlined onClick={() => copyColumn(errorData, "student_id", "رقم الطالب")} style={{ cursor: "pointer", opacity: 0.5 }} />
                        </Flex>
                      ),
                      dataIndex: "student_id",
                      width: 120
                    },
                    {
                      title: (
                        <Flex justify="space-between" align="center">
                          <span>الاسم</span>
                          <CopyOutlined onClick={() => copyColumn(errorData, "student_name", "اسم الطالب")} style={{ cursor: "pointer", opacity: 0.5 }} />
                        </Flex>
                      ),
                      dataIndex: "student_name",
                      render: (n) => n || <Text type="secondary">غير معروف</Text>
                    },
                    {
                      title: (
                        <Flex justify="space-between" align="center">
                          <span>السبب</span>
                          <CopyOutlined onClick={() => copyColumn(errorData, "reason", "السبب")} style={{ cursor: "pointer", opacity: 0.5 }} />
                        </Flex>
                      ),
                      dataIndex: "reason",
                      render: (r) => <Tag color="error">{r}</Tag>
                    }
                  ]}
                  size="small"
                  pagination={showAllErrors ? false : { pageSize: 5 }}
                />
              </Space>
            }
            type="error"
            showIcon
            closable
            onClose={() => setErrorData(null)}
          />
        )}

        <Table
          columns={columns}
          dataSource={students.map((s, i) => ({ ...s, key: i }))}
          loading={loading}
          bordered
          pagination={showAll ? false : {
            defaultPageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100", "500", "1000"]
          }}
          style={{ borderRadius: 24, overflow: "hidden" }}
          locale={{ emptyText: <Empty description="اختر كود امتحان الطلاب" /> }}
        />
      </Flex>

      <style jsx global>{`
        .metadata-strip {
          animation: slideDown 0.4s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
