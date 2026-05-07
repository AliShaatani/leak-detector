"use client";

import React, { useRef, useState } from "react";
import { Button, Typography, Flex, message, Upload, Modal, TreeSelect, Input } from "antd";
import { FileAddOutlined, LoadingOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function FilesHeader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) setCategories(data);
    } catch (err) {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      message.error("يرجى اختيار ملف PDF صالح");
      return;
    }
    setSelectedFile(file);
    setDocumentTitle(file.name.replace(/\.pdf$/i, ""));
    fetchCategories();
    setIsModalOpen(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", documentTitle.trim() || selectedFile.name.replace(/\.pdf$/i, ""));
    if (selectedCategory) {
      formData.append("categoryId", selectedCategory);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
        message.success("تم رفع الملف بنجاح");
        setIsModalOpen(false);
        setTimeout(() => {
          setSuccess(false);
          window.location.reload();
        }, 1200);
      } else {
        message.error("فشل الرفع. تأكد من أن الملف صالح.");
      }
    } catch (err) {
      message.error("حدث خطأ أثناء الرفع.");
    } finally {
      setUploading(false);
    }
  };

  // Helper to format categories for TreeSelect
  const formatCategories = (cats: any[], pid: string | null = null): any[] => {
    return cats
      .filter(c => c.parentId === pid)
      .map(c => ({
        value: c.id,
        title: c.name,
        children: formatCategories(cats, c.id)
      }));
  };

  return (
    <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
      <div>
        <Title level={2} style={{ margin: 0, color: "var(--text-main)", fontWeight: 900 }}>إدارة الملفات</Title>
        <Text type="secondary" style={{ color: "var(--text-dim)" }}>ارفع الملفات ووزعها على المستخدمين بأمان</Text>
      </div>

      <div className="upload-wrapper">
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: "none" }} 
          accept=".pdf"
          onChange={handleFileSelect}
        />
        
        <Button 
          type="primary"
          size="large"
          loading={uploading}
          icon={success ? <CheckCircleOutlined /> : <FileAddOutlined />}
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            height: 50, 
            borderRadius: 12, 
            padding: "0 24px", 
            fontWeight: 700,
            background: success ? "#52c41a" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            border: "none",
            boxShadow: "0 8px 20px rgba(59, 130, 246, 0.3)"
          }}
        >
          {uploading ? "جاري الرفع..." : success ? "تم الرفع!" : "رفع ملف جديد"}
        </Button>
      </div>

      <Modal
        title="رفع ملف جديد"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleUpload}
        okText="بدء الرفع"
        okButtonProps={{ disabled: !documentTitle.trim() }}
        cancelText="إلغاء"
        confirmLoading={uploading}
        centered
      >
        <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <Text style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>عنوان الملف <span style={{ color: "#f87171" }}>*</span></Text>
            <Input
              value={documentTitle}
              onChange={e => setDocumentTitle(e.target.value)}
              placeholder="اكتب عنوان الملف..."
              size="large"
              style={{ borderRadius: 10 }}
            />
          </div>
          <div>
            <Text style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>التصنيف</Text>
            <TreeSelect
              style={{ width: "100%" }}
              value={selectedCategory}
              dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
              treeData={formatCategories(categories)}
              placeholder="اختر التصنيف (اختياري)"
              treeDefaultExpandAll
              onChange={setSelectedCategory}
              allowClear
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            الملف المختار: {selectedFile?.name}
          </Text>
        </div>
      </Modal>
    </Flex>
  );
}
