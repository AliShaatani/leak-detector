"use client";

import React, { useState, useEffect } from "react";
import {
  Typography, Card, Space, Select, Table, Button,
  Upload, Switch, Tag, Alert, Progress, message,
  Flex, Divider, Badge, Modal, Empty
} from "antd";
import {
  UploadOutlined,
  SearchOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
  CopyOutlined
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
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState<{ value: string; label: string }[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [localParsing, setLocalParsing] = useState(true);
  const [errorData, setErrorData] = useState<any[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [zeroMissing, setZeroMissing] = useState(false);
  const [showAllErrors, setShowAllErrors] = useState(false);

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
        message.error(data.error || "فشل في جلب البيانات الوصفية");
      }
    } catch (err) {
      message.error("فشل الطلب");
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
        message.error("فشل في تحليل ملف Excel");
      }
    };
    reader.readAsBinaryString(file);
    return false;
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
        message.success(`تمت رصد ${data.processed_count} درجة بنجاح`);
        fetchStudents(selectedPlan, metadata!.student_group);
      } else if (data.status === "error") {
        if (data.missing_students) {
          setErrorData(data.missing_students);
          Modal.error({
            title: "فشل التحقق: طلاب مفقودون",
            content: "يحتوي الملف المرفوع على طلاب لا ينتمون لمجموعة الطلاب المختارة. يرجى اضافتهم قبل اعادة المحاوله.",
            width: 600,
            okText: "حسناً",
            icon: <ExclamationCircleOutlined color="#ff4d4f" />
          });
        } else {
          message.error(data.message || "فشل في معالجة الدرجات");
        }
      }
    } catch (err) {
      message.error("فشل الرفع");
    } finally {
      setUploading(false);
    }
  };

  const handleZeroDrafts = () => {
    if (!selectedPlan || !metadata) return;
    
    const drafts = students.filter(s => s.docstatus === 0);
    if (drafts.length === 0) {
      message.info("لا يوجد طلاب بوضعية مسودة لتصفيرهم.");
      return;
    }

    Modal.confirm({
      title: "تصفير المسودات",
      content: `هل أنت متأكد من رصد 0 درجة لـ ${drafts.length} طالب (حالتهم مسودة)؟ سيتم اعتبارهم غائبين.`,
      okText: "نعم، تصفير",
      okType: "danger",
      cancelText: "إلغاء",
      onOk: async () => {
        const scores = drafts.map(s => {
          const row: any = { "الرقم": s.numeric_id || s.student };
          metadata.criteria.forEach(c => {
            row[c.assessment_criteria] = 0;
          });
          return row;
        });
        await processScores(scores);
      }
    });
  };

  const copyColumn = (data: any[], dataIndex: string | ((item: any) => string), title: string) => {
    const text = data.map(item => typeof dataIndex === 'function' ? dataIndex(item) : (item[dataIndex] || "")).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      message.success(`تم نسخ ${title}`);
    });
  };

  const columns = [
    {
      title: "#",
      key: "index",
      width: 60,
      align: "center",
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
            <Button 
              type="primary"
              danger
              icon={<CheckCircleOutlined />} 
              onClick={handleZeroDrafts}
              disabled={!selectedPlan || students.filter(s => s.docstatus === 0).length === 0}
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
          pagination={{
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
