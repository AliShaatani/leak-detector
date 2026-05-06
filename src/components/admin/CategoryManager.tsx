"use client";

import React, { useState, useEffect } from "react";
import { Tree, Button, Modal, Form, Input, message, Popconfirm, Card, Flex, Typography, TreeSelect } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOpenOutlined, FolderOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children?: Category[];
  _count?: { documents: number };
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (res.ok) {
        setCategories(data);
      }
    } catch (error) {
      message.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = (parent: Category | null = null) => {
    setEditingCategory(null);
    setParentCategory(parent);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setParentCategory(null);
    form.setFieldsValue({ name: category.name, parentId: category.parentId });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: { name: string; parentId?: string | null }) => {
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}` 
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";
      
      const body = editingCategory 
        ? values 
        : { ...values, parentId: parentCategory?.id };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success(editingCategory ? "Category updated" : "Category created");
        setIsModalOpen(false);
        fetchCategories();
      } else {
        const data = await res.json();
        message.error(data.error || "Failed to save category");
      }
    } catch (error) {
      message.error("Error saving category");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        message.success("Category deleted");
        fetchCategories();
      } else {
        const data = await res.json();
        message.error(data.error || "Failed to delete category");
      }
    } catch (error) {
      message.error("Error deleting category");
    }
  };

  // Build tree data for Ant Design
  const buildTreeData = (cats: Category[], pid: string | null = null): any[] => {
    return cats
      .filter(c => c.parentId === pid)
      .map(c => ({
        key: c.id,
        title: (
          <Flex align="center" justify="space-between" style={{ width: "100%", padding: "4px 0" }}>
            <span style={{ fontSize: 15, fontWeight: 500 }}>
              {c.name} <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>({c._count?.documents || 0} ملف)</Text>
            </span>
            <Flex gap={8} className="category-actions">
              <Button 
                size="small" 
                type="text" 
                icon={<PlusOutlined />} 
                onClick={(e) => { e.stopPropagation(); handleAdd(c); }}
                title="أضف تصنيف فرعي"
              />
              <Button 
                size="small" 
                type="text" 
                icon={<EditOutlined />} 
                onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                title="تعديل"
              />
              <Popconfirm
                title="حذف التصنيف؟"
                description="تأكد من عدم وجود ملفات أو تصنيفات فرعية بداخله."
                onConfirm={(e) => { e?.stopPropagation(); handleDelete(c.id); }}
                onCancel={(e) => e?.stopPropagation()}
              >
                <Button 
                  size="small" 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={(e) => e.stopPropagation()}
                  title="حذف"
                />
              </Popconfirm>
            </Flex>
          </Flex>
        ),
        icon: ({ expanded }: any) => expanded ? <FolderOpenOutlined /> : <FolderOutlined />,
        children: buildTreeData(cats, c.id)
      }));
  };

  // Helper to format categories for TreeSelect (prevents selecting self or descendants)
  const formatCategories = (cats: Category[], pid: string | null = null, currentEditId: string | null = null): any[] => {
    return cats
      .filter(c => c.parentId === pid && c.id !== currentEditId)
      .map(c => ({
        value: c.id,
        title: c.name,
        children: formatCategories(cats, c.id, currentEditId)
      }));
  };

  const treeData = buildTreeData(categories);

  return (
    <div className="category-manager">
      <Card 
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}
        styles={{ body: { padding: 32 } }}
      >
        <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
          <div>
            <Title level={4} style={{ color: "#fff", margin: 0 }}>إدارة تصنيفات الملفات</Title>
            <Text type="secondary">نظّم مكتبة ملفاتك في مجموعات هرمية لسهولة الوصول</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => handleAdd(null)}
            style={{ 
              height: 40, 
              borderRadius: 10, 
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              border: "none"
            }}
          >
            إضافة مجموعة رئيسية
          </Button>
        </Flex>

        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>جاري التحميل...</div>
        ) : treeData.length > 0 ? (
          <Tree
            showIcon
            blockNode
            defaultExpandAll
            selectable={false}
            treeData={treeData}
            style={{ background: "transparent", color: "#fff" }}
            className="custom-category-tree"
          />
        ) : (
          <div style={{ padding: "60px 0", textAlign: "center", background: "rgba(255,255,255,0.01)", borderRadius: 12 }}>
            <FolderOutlined style={{ fontSize: 48, color: "rgba(255,255,255,0.05)", marginBottom: 16 }} />
            <br />
            <Text type="secondary">لم يتم إنشاء أي تصنيفات بعد. ابدأ بإضافة مجموعة رئيسية.</Text>
          </div>
        )}
      </Card>

      <Modal
        title={editingCategory ? "تعديل التصنيف" : parentCategory ? `إضافة تصنيف فرعي لـ ${parentCategory.name}` : "إضافة مجموعة رئيسية"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText="حفظ"
        cancelText="إلغاء"
        centered
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 20 }}>
          <Form.Item
            name="name"
            label="اسم التصنيف"
            rules={[{ required: true, message: "يرجى إدخال اسم التصنيف" }]}
          >
            <Input placeholder="مثال: امتحانات نهائية، نماذج تدريبية..." />
          </Form.Item>
          
          {editingCategory && (
            <Form.Item
              name="parentId"
              label="المجموعة التابعة لها (اختياري)"
            >
              <TreeSelect
                treeData={formatCategories(categories, null, editingCategory.id)}
                placeholder="بدون مجموعة رئيسية (تصنيف رئيسي)"
                allowClear
                treeDefaultExpandAll
                style={{ width: "100%" }}
                dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
                className="custom-tree-select"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <style jsx global>{`
        .custom-category-tree .ant-tree-node-content-wrapper:hover {
          background: rgba(255, 255, 255, 0.03) !important;
        }
        .custom-category-tree .ant-tree-node-content-wrapper {
          color: #fff !important;
          transition: all 0.2s;
        }
        .custom-category-tree .ant-tree-switcher {
          color: rgba(255, 255, 255, 0.45) !important;
        }
        .category-actions {
          opacity: 0;
          transition: opacity 0.2s;
        }
        .ant-tree-node-content-wrapper:hover .category-actions {
          opacity: 1;
        }
        .ant-modal-content {
          background: #111827 !important;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .ant-modal-header {
          background: transparent !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .ant-modal-title, .ant-form-item-label label {
          color: #fff !important;
        }
        .ant-modal-close {
          color: rgba(255,255,255,0.45) !important;
        }
        .ant-input {
          background: rgba(255,255,255,0.02) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
        .custom-tree-select .ant-select-selector {
          background: rgba(255,255,255,0.02) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
        .custom-tree-select .ant-select-arrow {
          color: rgba(255,255,255,0.45) !important;
        }
      `}</style>
    </div>
  );
}
