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
  DatabaseOutlined
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

  const searchPlans = async (term: string) => {
    try {
      const res = await fetch(`/api/erpnext/bulk?method=search_plans&term=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPlans(data.map(p => ({ value: p.value, label: p.value + (p.description ? ` - ${p.description}` : '') })));
      }
    } catch (err) {
      console.error("Search failed", err);
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
        message.error(data.error || "Failed to fetch metadata");
      }
    } catch (err) {
      message.error("Request failed");
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
    if (!localParsing) {
      // Server-side parsing would typically upload to a bucket then send URL
      // For this demo/requirement, we'll focus on the API interaction
      message.info("Server-side parsing selected. In production, this would upload the file first.");
      return false;
    }

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
        message.error("Failed to parse Excel file");
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
        message.success(`Successfully processed ${data.processed_count} scores`);
        fetchStudents(selectedPlan, metadata!.student_group);
      } else if (data.status === "error") {
        if (data.missing_students) {
          setErrorData(data.missing_students);
          Modal.error({
            title: "Validation Failed: Missing Students",
            content: "The uploaded file contains students who are not in the selected Student Group. Please see the error table below.",
            width: 600
          });
        } else {
          message.error(data.message || "Failed to process scores");
        }
      }
    } catch (err) {
      message.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      title: "Student ID",
      dataIndex: "student",
      key: "student",
      width: 150,
    },
    {
      title: "Student Name",
      dataIndex: "student_name",
      key: "student_name",
      ellipsis: true,
    },
    ...(metadata?.criteria || []).map(c => ({
      title: `${c.assessment_criteria} (/${c.maximum_score})`,
      key: c.assessment_criteria,
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
      title: "Status",
      dataIndex: "docstatus",
      key: "status",
      render: (status: number) => (
        status === 1 
          ? <Tag color="success">Submitted</Tag> 
          : <Tag color="warning">Draft</Tag>
      )
    }
  ];

  return (
    <div className="animate-fade">
      <Flex vertical gap={24}>
        <Flex justify="space-between" align="center">
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 900 }}>Bulk Assessments</Title>
            <Text type="secondary">Import and verify student scores from external files.</Text>
          </div>
          <Space size={20}>
            <Space>
              <Text style={{ fontSize: 13 }}>Zeroing Empty Students</Text>
              <Switch 
                checked={zeroMissing} 
                onChange={setZeroMissing} 
                size="small"
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </Space>
            <Divider type="vertical" />
            <Switch 
              checkedChildren="Local" 
              unCheckedChildren="Server" 
              checked={localParsing} 
              onChange={setLocalParsing} 
            />
            <Button 
              icon={<SearchOutlined />} 
              onClick={() => selectedPlan && fetchStudents(selectedPlan, metadata!.student_group)}
              disabled={!selectedPlan}
            >
              Refresh Scores
            </Button>
          </Space>
        </Flex>

        <Card bordered={false} className="glass" style={{ borderRadius: 24 }}>
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <Flex gap={16} align="flex-end">
              <div style={{ flex: 1 }}>
                <Text strong style={{ display: "block", marginBottom: 8 }}>Select Assessment Plan</Text>
                <Select
                  showSearch
                  placeholder="Type plan name or ID..."
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
                  Upload Excel
                </Button>
              </Upload>
            </Flex>

            {metadata && (
              <Flex gap={24} className="metadata-strip" style={{ 
                background: "var(--bg)", 
                padding: "16px 24px", 
                borderRadius: 16,
                border: "1px solid var(--border)"
              }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>COURSE</Text>
                  <Text strong style={{ display: "block" }}>{metadata.course_name} ({metadata.course_code})</Text>
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>STUDENT GROUP</Text>
                  <Text strong style={{ display: "block" }}>{metadata.student_group}</Text>
                </div>
                <Divider type="vertical" style={{ height: 40 }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>ENROLLED</Text>
                  <Text strong style={{ display: "block" }}>{students.length} Students</Text>
                </div>
              </Flex>
            )}
          </Space>
        </Card>

        {errorData && (
          <Alert
            message="Validation Errors"
            description={
              <Space direction="vertical" style={{ width: "100%", marginTop: 10 }}>
                <Text>The following records in your file could not be processed:</Text>
                <Table
                  dataSource={errorData.map((err, i) => ({ ...err, key: i }))}
                  columns={[
                    { title: "ID", dataIndex: "student_id", width: 120 },
                    { title: "Name", dataIndex: "student_name", render: (n) => n || <Text type="secondary">Unknown</Text> },
                    { title: "Reason", dataIndex: "reason", render: (r) => <Tag color="error">{r}</Tag> }
                  ]}
                  size="small"
                  pagination={{ pageSize: 5 }}
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
          pagination={{ pageSize: 20 }}
          style={{ borderRadius: 24, overflow: "hidden" }}
          locale={{ emptyText: <Empty description="Select a plan to see students" /> }}
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
