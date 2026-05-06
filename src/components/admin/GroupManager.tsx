"use client";

import React, { useState, useEffect } from "react";
import { Table, Button, Modal, Form, Input, message, Popconfirm, Card, Flex, Typography, Transfer } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, SearchOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function GroupManager() {
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [targetKeys, setTargetKeys] = useState<string[]>([]);
  const [form] = Form.useForm();

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/groups");
      if (res.ok) {
        setGroups(await res.json());
      }
    } catch (err) {
      message.error("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchGroups();
    fetchUsers();
  }, []);

  const handleAdd = () => {
    setEditingGroup(null);
    setTargetKeys([]);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = async (group: any) => {
    setEditingGroup(group);
    form.setFieldsValue({ name: group.name });
    
    // Fetch group users
    try {
      const res = await fetch(`/api/groups/${group.id}`);
      if (res.ok) {
        const data = await res.json();
        setTargetKeys(data.users.map((u: any) => u.id));
      }
    } catch (e) {
      setTargetKeys([]);
    }

    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        message.success("Group deleted");
        fetchGroups();
      } else {
        message.error("Failed to delete group");
      }
    } catch (error) {
      message.error("Error deleting group");
    }
  };

  const handleSubmit = async (values: { name: string }) => {
    try {
      const url = editingGroup ? `/api/groups/${editingGroup.id}` : "/api/groups";
      const method = editingGroup ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.name, userIds: targetKeys }),
      });

      if (res.ok) {
        message.success(editingGroup ? "Group updated" : "Group created");
        setIsModalOpen(false);
        fetchGroups();
      } else {
        const data = await res.json();
        message.error(data.error || "Failed to save group");
      }
    } catch (error) {
      message.error("Error saving group");
    }
  };

  const columns = [
    {
      title: "اسم المجموعة",
      dataIndex: "name",
      key: "name",
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string) => <Text strong style={{ color: "#fff" }}>{text}</Text>,
    },
    {
      title: "عدد الأعضاء",
      key: "members",
      sorter: (a: any, b: any) => (a._count?.users || 0) - (b._count?.users || 0),
      render: (record: any) => (
        <Text type="secondary">{record._count?.users || 0} مستخدم</Text>
      ),
    },
    {
      title: "تاريخ الإنشاء",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => (
        <Text style={{ color: "rgba(255,255,255,0.45)" }}>
          {new Date(date).toLocaleDateString("en-GB")}
        </Text>
      ),
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (record: any) => (
        <Flex gap={8}>
          <Button 
            type="primary" 
            ghost 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="هل أنت متأكد من حذف هذه المجموعة؟"
            onConfirm={() => handleDelete(record.id)}
            okText="نعم"
            cancelText="لا"
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  const filteredData = groups.filter(g => 
    g.name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="group-manager">
      <Card 
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16 }}
        styles={{ body: { padding: 32 } }}
      >
        <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
          <div>
            <Title level={4} style={{ color: "#fff", margin: 0 }}>إدارة المجموعات</Title>
            <Text type="secondary">نظّم المستخدمين في مجموعات لتسهيل توزيع الملفات</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            style={{ 
              height: 40, 
              borderRadius: 10, 
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              border: "none"
            }}
          >
            إضافة مجموعة جديدة
          </Button>
        </Flex>

        <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
          <Input
            placeholder="بحث في المجموعات..."
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
          dataSource={filteredData.map(g => ({ ...g, key: g.id }))}
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `عرض ${range[0]}-${range[1]} من أصل ${total} مجموعة`
          }}
          className="custom-antd-table"
        />
      </Card>

      <Modal
        title={
          <Flex gap={12} align="center">
            <div style={{ 
              width: 40, height: 40, borderRadius: 12, 
              background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6",
              display: "flex", alignItems: "center", justifyContent: "center" 
            }}>
              <TeamOutlined style={{ fontSize: 20 }} />
            </div>
            <Text strong style={{ color: "#fff", fontSize: 18 }}>
              {editingGroup ? "تعديل المجموعة" : "مجموعة جديدة"}
            </Text>
          </Flex>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        okText="حفظ المجموعة"
        cancelText="إلغاء"
        centered
        styles={{
          mask: { backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.6)" },
          body: { borderRadius: 24, padding: "24px" }
        }}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="اسم المجموعة"
            rules={[{ required: true, message: "يرجى إدخال اسم المجموعة" }]}
          >
            <Input size="large" placeholder="مثال: طلاب الصف الأول، قسم التسويق..." />
          </Form.Item>

          <Form.Item label="أعضاء المجموعة">
            <Transfer
              dataSource={users.map(u => ({ key: u.id, title: `${u.name} (@${u.username})` }))}
              titles={['المستخدمين المتاحين', 'أعضاء المجموعة']}
              targetKeys={targetKeys}
              onChange={(keys) => setTargetKeys(keys as string[])}
              render={item => item.title}
              listStyle={{
                width: 300,
                height: 300,
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.1)",
              }}
              style={{ display: "flex", justifyContent: "center" }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx global>{`
        .ant-transfer-list-header {
          background: rgba(255,255,255,0.05) !important;
          color: #fff !important;
          border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        }
        .ant-transfer-list-content-item {
          color: #fff !important;
        }
        .ant-transfer-list-content-item:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .ant-empty-description {
          color: rgba(255,255,255,0.45) !important;
        }
      `}</style>
    </div>
  );
}
