"use client";

import React, { useState } from "react";
import { Table, Button, Space, Typography, Tag, Modal, Tooltip, message, Input, Flex, Select, Checkbox } from "antd";
import { 
  QrcodeOutlined, 
  ShareAltOutlined, 
  DeleteOutlined, 
  FilePdfOutlined,
  EnvironmentOutlined,
  FolderOutlined,
  SearchOutlined,
  SafetyOutlined,
  DownloadOutlined
} from "@ant-design/icons";
import AssignmentModal from "./AssignmentModal";
import dynamic from "next/dynamic";

const PdfPositioner = dynamic(() => import("./PdfPositioner"), {
  ssr: false,
  loading: () => <div className="p-20 text-center">جاري تحميل أداة التحديد...</div>,
});
import { motion, AnimatePresence } from "framer-motion";

const { Text } = Typography;

export default function FilesList({ initialFiles }: { initialFiles: any[] }) {
  const [files, setFiles] = useState(initialFiles);
  const [searchText, setSearchText] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const adminUserId = typeof window !== "undefined" ? localStorage.getItem("user_id") : null;
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [positioningFile, setPositioningFile] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedFileAssignments, setSelectedFileAssignments] = useState<{ userAssignments: any[], groupAssignments: any[] }>({ userAssignments: [], groupAssignments: [] });
  const [modal, contextHolder] = Modal.useModal();

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
  };

  const handleOpenAssign = async (file: any) => {
    setSelectedFile(file);
    fetchUsers();
    try {
      const resG = await fetch("/api/groups");
      if (resG.ok) setGroups(await resG.json());
    } catch(e) {}
    try {
      const res = await fetch(`/api/assignments/${file.id}`);
      if (res.ok) {
        const assignments = await res.json();
        setSelectedFileAssignments(assignments);
      } else {
        setSelectedFileAssignments({ userAssignments: [], groupAssignments: [] });
      }
    } catch (e) {
      setSelectedFileAssignments({ userAssignments: [], groupAssignments: [] });
    }
    setIsAssignOpen(true);
  };

  const handleDelete = async (id: string) => {
    modal.confirm({
      title: "هل أنت متأكد من حذف هذا الملف؟",
      content: "سيتم حذف جميع التخصيصات المرتبطة بهذا الملف أيضاً.",
      okText: "نعم، احذف",
      cancelText: "إلغاء",
      okType: "danger",
      centered: true,
      onOk: async () => {
        try {
          await fetch(`/api/files/${id}`, { method: "DELETE" });
          setFiles(files.filter((f) => f.id !== id));
          message.success("تم حذف الملف بنجاح");
        } catch (error) {
          message.error("فشل في حذف الملف");
        }
      }
    });
  };

  const handleSaveCoords = async (x: number, y: number, scale: number) => {
    if (!positioningFile) return;

    try {
      const res = await fetch(`/api/files/${positioningFile.id}/coords`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrX: x, qrY: y, qrScale: scale }),
      });

      if (res.ok) {
        setFiles(files.map(f => f.id === positioningFile.id ? { ...f, qrX: x, qrY: y, qrScale: scale } : f));
        setPositioningFile(null);
        message.success("تم حفظ إحداثيات الـ QR بنجاح");
      }
    } catch (error) {
      message.error("حدث خطأ أثناء الحفظ");
    }
  };

  const handleMarginModeChange = async (fileId: string, marginMode: string) => {
    try {
      const res = await fetch(`/api/files/${fileId}/coords`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginMode }),
      });
      if (res.ok) {
        setFiles(files.map(f => f.id === fileId ? { ...f, marginMode } : f));
        message.success("تم حفظ إعداد خط الهامش");
      } else {
        message.error("فشل حفظ الإعداد");
      }
    } catch {
      message.error("خطأ في الاتصال");
    }
  };

  const handleAdminDownload = async (file: any) => {
    if (!adminUserId) {
      message.error("لم يتم تحديد معرف المستخدم. أعد تسجيل الدخول.");
      return;
    }
    setDownloadingId(file.id);
    try {
      window.location.href = `/api/admin/download/${file.id}?userId=${adminUserId}`;
      setTimeout(() => setDownloadingId(null), 3000);
    } catch {
      setDownloadingId(null);
      message.error("فشل التحميل");
    }
  };

  const handleBarcodeToggle = async (fileId: string, field: "barcodeEnabled" | "barcodeAllPages", value: boolean) => {
    try {
      const res = await fetch(`/api/files/${fileId}/coords`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setFiles(files.map(f => f.id === fileId ? { ...f, [field]: value } : f));
        message.success("تم حفظ الإعداد");
      } else {
        message.error("فشل حفظ الإعداد");
      }
    } catch {
      message.error("خطأ في الاتصال");
    }
  };

  const categoryFilters = Array.from(new Set(files.map((f: any) => f.category?.name).filter(Boolean))).map(name => ({ text: name, value: name }));

  const columns = [
    {
      title: "اسم الملف",
      dataIndex: "name",
      key: "name",
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string) => (
        <Space>
          <FilePdfOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />
          <Text strong style={{ color: "#fff" }}>{text}</Text>
        </Space>
      ),
    },
    {
      title: "التصنيف",
      dataIndex: "category",
      key: "category",
      filters: categoryFilters as any,
      onFilter: (value: any, record: any) => record.category?.name === value,
      sorter: (a: any, b: any) => (a.category?.name || "").localeCompare(b.category?.name || ""),
      render: (category: any) => (
        category ? (
          <Tag icon={<FolderOutlined />} color="default" style={{ borderRadius: 6, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)" }}>
            {category.name}
          </Tag>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>بدون تصنيف</Text>
        )
      ),
    },
    {
      title: "الإحداثيات",
      key: "coords",
      render: (record: any) => (
        <Tag color="blue">
          X: {Math.round(record.qrX)}% | Y: {Math.round(record.qrY)}%
        </Tag>
      ),
    },
    {
      title: "المقياس",
      dataIndex: "qrScale",
      key: "scale",
      render: (scale: number) => <Tag color="purple">{scale?.toFixed(1)}x</Tag>,
    },
    {
      title: "تاريخ الرفع",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => (
        <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
          {new Date(date).toLocaleDateString("en-GB")}
        </Text>
      ),
    },
    {
      title: <Space><SafetyOutlined />خط الأمان</Space>,
      key: "marginMode",
      render: (record: any) => (
        <Select
          value={record.marginMode || "both"}
          onChange={(val) => handleMarginModeChange(record.id, val)}
          size="small"
          style={{ width: 110 }}
          options={[
            { value: "both",   label: "أعلى + أسفل" },
            { value: "top",    label: "أعلى فقط" },
            { value: "bottom", label: "أسفل فقط" },
            { value: "none",   label: "معطّل" },
          ]}
          popupMatchSelectWidth={false}
        />
      ),
    },
    {
      title: "باركود",
      key: "barcodeEnabled",
      align: "center" as const,
      render: (record: any) => (
        <Flex vertical align="center" gap={4}>
          <Checkbox
            checked={!!record.barcodeEnabled}
            onChange={e => handleBarcodeToggle(record.id, "barcodeEnabled", e.target.checked)}
          >
            تفعيل
          </Checkbox>
          <Checkbox
            checked={!!record.barcodeAllPages}
            disabled={!record.barcodeEnabled}
            onChange={e => handleBarcodeToggle(record.id, "barcodeAllPages", e.target.checked)}
          >
            كل الصفحات
          </Checkbox>
        </Flex>
      ),
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (record: any) => (
        <Space size="middle">
          <Tooltip
            title="تنزيل بهويتي"
            overlayInnerStyle={{ background: "linear-gradient(135deg, #2d1b69 0%, #1e1040 100%)", border: "1px solid rgba(139,92,246,0.4)", color: "#c4b5fd", borderRadius: 10, fontWeight: 600, fontSize: 13 }}
            arrow={false}
          >
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleAdminDownload(record)}
              loading={downloadingId === record.id}
              style={{ background: "rgba(139,92,246,0.1)", color: "#8b5cf6", borderColor: "#8b5cf6" }}
            />
          </Tooltip>
          <Tooltip
            title="تحديد موقع الباركود"
            overlayInnerStyle={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f1f38 100%)", border: "1px solid rgba(59,130,246,0.4)", color: "#93c5fd", borderRadius: 10, fontWeight: 600, fontSize: 13 }}
            arrow={false}
          >
            <Button
              icon={<EnvironmentOutlined />}
              onClick={() => setPositioningFile(record)}
              type="primary"
              ghost
            />
          </Tooltip>
          <Tooltip
            title="توزيع على الطلاب"
            overlayInnerStyle={{ background: "linear-gradient(135deg, #14532d 0%, #052e16 100%)", border: "1px solid rgba(34,197,94,0.4)", color: "#86efac", borderRadius: 10, fontWeight: 600, fontSize: 13 }}
            arrow={false}
          >
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => handleOpenAssign(record)}
              style={{ background: "rgba(34, 197, 94, 0.1)", color: "#22c55e", borderColor: "#22c55e" }}
            />
          </Tooltip>
          <Tooltip
            title="حذف الملف"
            overlayInnerStyle={{ background: "linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", borderRadius: 10, fontWeight: 600, fontSize: 13 }}
            arrow={false}
          >
            <Button 
              icon={<DeleteOutlined />} 
              onClick={() => handleDelete(record.id)} 
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredData = files.filter(f => 
    f.name.toLowerCase().includes(searchText.toLowerCase()) || 
    f.filename.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="files-list-container">
      {contextHolder}
      
      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Input
          placeholder="بحث في الملفات..."
          prefix={<SearchOutlined style={{ color: "rgba(255,255,255,0.45)" }} />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          size="large"
          allowClear
          style={{
            maxWidth: 350,
            borderRadius: 12,
            background: "rgba(255,255,255,0.03)",
            borderColor: "rgba(255,255,255,0.1)",
            color: "#fff"
          }}
        />
      </Flex>

      <Table 
        columns={columns} 
        dataSource={filteredData.map(f => ({ ...f, key: f.id }))}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `عرض ${range[0]}-${range[1]} من أصل ${total} ملف`
        }}
        scroll={{ x: 'max-content' }}
        className="custom-antd-table"
      />

      <AssignmentModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        users={users}
        groups={groups}
        files={selectedFile ? [selectedFile] : []}
        initialAssignments={selectedFileAssignments}
        onAssign={async (data) => {
          const res = await fetch("/api/assignments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error("Failed to assign");
        }}
      />

      {positioningFile && (
        <div className="fullscreen-positioner">
          <PdfPositioner 
            fileUrl={`/uploads/${positioningFile.filename}`}
            initialX={positioningFile.qrX}
            initialY={positioningFile.qrY}
            onSave={handleSaveCoords}
            onClose={() => setPositioningFile(null)}
          />
        </div>
      )}

      <style jsx>{`
        .files-list-container {
          background: var(--surface);
          border-radius: 24px;
          padding: 24px;
          border: 1px solid var(--border);
        }

        .fullscreen-positioner {
          position: fixed;
          top: 0;
          left: 0;
          right: var(--sidebar-width, 280px);
          bottom: 0;
          z-index: 999999;
          margin: 0 !important;
          padding: 0 !important;
          background: #080a0f;
        }

        @media (max-width: 992px) {
          .fullscreen-positioner {
            right: 0;
          }
        }

        :global(.custom-antd-table .ant-table) {
          background: transparent !important;
          color: #fff !important;
        }

        :global(.custom-antd-table .ant-table-thead > tr > th) {
          background: rgba(255, 255, 255, 0.03) !important;
          color: rgba(255, 255, 255, 0.45) !important;
          border-bottom: 1px solid var(--border) !important;
        }

        :global(.custom-antd-table .ant-table-tbody > tr > td) {
          border-bottom: 1px solid var(--border) !important;
        }

        :global(.custom-antd-table .ant-table-tbody > tr:hover > td) {
          background: rgba(59, 130, 246, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
