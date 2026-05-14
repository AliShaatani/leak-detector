"use client";

import React, { useEffect, useState } from "react";
import {
  Typography, Card, Table, Tag, Space, Flex, Statistic,
  Button, Input, Select, Empty, Badge, Tooltip, message
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  FileExcelOutlined,
  DeleteColumnOutlined,
  ReloadOutlined,
  SearchOutlined,
  BarChartOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  CalendarOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { Search } = Input;

interface AssessmentLog {
  id: string;
  assessmentPlan: string;
  courseName: string;
  studentGroup: string;
  submittedCount: number;
  operationType: string;
  performedBy: string;
  createdAt: string;
}

const OP_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  excel:       { label: "رفع Excel",       color: "green",  icon: <FileExcelOutlined /> },
  zero_drafts: { label: "تصفير المسودات",  color: "orange", icon: <DeleteColumnOutlined /> },
};

export default function AssessmentLogsPage() {
  const [logs, setLogs]         = useState<AssessmentLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [opFilter, setOpFilter] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assessment-logs");
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch {
      message.error("فشل تحميل السجلات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  // Derived stats
  const totalOps         = logs.length;
  const totalScores      = logs.reduce((s, l) => s + l.submittedCount, 0);
  const uniquePlans      = new Set(logs.map(l => l.assessmentPlan)).size;
  const todayOps         = logs.filter(l =>
    new Date(l.createdAt).toDateString() === new Date().toDateString()
  ).length;

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      l.assessmentPlan.toLowerCase().includes(q) ||
      l.courseName.toLowerCase().includes(q) ||
      l.studentGroup.toLowerCase().includes(q) ||
      l.performedBy.toLowerCase().includes(q);
    const matchOp = !opFilter || l.operationType === opFilter;
    return matchSearch && matchOp;
  });

  const columns: ColumnsType<AssessmentLog> = [
    {
      title: "#",
      key: "idx",
      width: 55,
      align: "center",
      render: (_: any, __: any, i: number) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{i + 1}</Text>
      ),
    },
    {
      title: "كود الامتحان",
      dataIndex: "assessmentPlan",
      key: "assessmentPlan",
      width: 220,
      render: (v: string) => (
        <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>{v}</Text>
      ),
    },
    {
      title: "المقرر",
      dataIndex: "courseName",
      key: "courseName",
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "مجموعة الطلاب",
      dataIndex: "studentGroup",
      key: "studentGroup",
      ellipsis: true,
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "العملية",
      dataIndex: "operationType",
      key: "operationType",
      width: 160,
      filters: [
        { text: "رفع Excel",      value: "excel" },
        { text: "تصفير المسودات", value: "zero_drafts" },
      ],
      onFilter: (val, rec) => rec.operationType === val,
      render: (v: string) => {
        const meta = OP_LABELS[v] || { label: v, color: "default", icon: null };
        return (
          <Tag color={meta.color} icon={meta.icon} style={{ borderRadius: 8, padding: "2px 10px" }}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "الدرجات المرصودة",
      dataIndex: "submittedCount",
      key: "submittedCount",
      width: 140,
      align: "center",
      sorter: (a, b) => a.submittedCount - b.submittedCount,
      render: (v: number) => (
        <Badge
          count={v}
          overflowCount={9999}
          style={{ backgroundColor: "#52c41a", fontSize: 12, fontWeight: 700, minWidth: 40 }}
        />
      ),
    },
    {
      title: "المستخدم",
      dataIndex: "performedBy",
      key: "performedBy",
      width: 130,
      render: (v: string) => (
        <Tag style={{ borderRadius: 8 }}>{v}</Tag>
      ),
    },
    {
      title: "التاريخ والوقت",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
      render: (v: string) => {
        const d = new Date(v);
        return (
          <Flex vertical gap={2}>
            <Text style={{ fontSize: 13 }}>{d.toLocaleDateString("ar-EG")}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </Flex>
        );
      },
    },
  ];

  return (
    <div className="animate-fade" dir="rtl">
      <Flex vertical gap={28}>

        {/* Header */}
        <Flex justify="space-between" align="center">
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 900 }}>سجل عمليات الرصد</Title>
            <Text type="secondary">تتبع جميع عمليات رصد الدرجات الناجحة</Text>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchLogs}
            loading={loading}
            style={{ borderRadius: 12 }}
          >
            تحديث
          </Button>
        </Flex>

        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[
            { title: "إجمالي العمليات",    value: totalOps,    icon: <BarChartOutlined />,    color: "#6366f1" },
            { title: "درجات مرصودة",       value: totalScores, icon: <CheckCircleOutlined />, color: "#22c55e" },
            { title: "أكواد امتحانات",     value: uniquePlans, icon: <CalendarOutlined />,    color: "#f59e0b" },
            { title: "عمليات اليوم",       value: todayOps,    icon: <TeamOutlined />,        color: "#3b82f6" },
          ].map(({ title, value, icon, color }) => (
            <Card
              key={title}
              bordered={false}
              className="glass"
              style={{ borderRadius: 20, borderTop: `3px solid ${color}` }}
            >
              <Flex align="center" gap={16}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: `${color}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, color
                }}>
                  {icon}
                </div>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>}
                  value={value}
                  valueStyle={{ fontSize: 24, fontWeight: 800, color }}
                />
              </Flex>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Flex gap={12}>
          <Search
            placeholder="بحث بكود الامتحان، المقرر، المجموعة، أو المستخدم..."
            allowClear
            style={{ flex: 1 }}
            onChange={e => setSearch(e.target.value)}
          />
          <Select
            placeholder="نوع العملية"
            allowClear
            style={{ width: 180 }}
            onChange={setOpFilter}
            options={[
              { value: "excel",       label: "رفع Excel" },
              { value: "zero_drafts", label: "تصفير المسودات" },
            ]}
          />
        </Flex>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={filtered.map(l => ({ ...l, key: l.id }))}
          loading={loading}
          bordered
          pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ["20", "50", "100"] }}
          style={{ borderRadius: 20, overflow: "hidden" }}
          locale={{ emptyText: <Empty description="لا توجد سجلات بعد" /> }}
          summary={() =>
            filtered.length > 0 ? (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={5}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    إجمالي النتائج المعروضة: {filtered.length} عملية
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">
                  <Text strong style={{ color: "#22c55e" }}>
                    {filtered.reduce((s, l) => s + l.submittedCount, 0)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} colSpan={2} />
              </Table.Summary.Row>
            ) : null
          }
        />
      </Flex>
    </div>
  );
}
