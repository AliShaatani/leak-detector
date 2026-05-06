"use client";

import React, { useState } from "react";
import { Table, Button, Space, Tag, Avatar, message, Tooltip, Modal, Form, Input, Flex } from "antd";
import { UserOutlined, DeleteOutlined, KeyOutlined, SafetyCertificateOutlined, SearchOutlined } from "@ant-design/icons";

export default function UsersList({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchText, setSearchText] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [modal, contextHolder] = Modal.useModal();

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        message.success("تم حذف المستخدم بنجاح");
      } else {
        const data = await res.json();
        message.error(data.error || "فشل حذف المستخدم");
      }
    } catch (err) {
      message.error("فشل في حذف المستخدم");
    }
  };

  const handleChangePassword = async (values: any) => {
    if (!editingUser) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.password }),
      });

      if (res.ok) {
        message.success("تم تغيير كلمة المرور بنجاح");
        setIsPasswordModalOpen(false);
        form.resetFields();
      } else {
        message.error("فشل في تغيير كلمة المرور");
      }
    } catch (err) {
      message.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "المستخدم",
      dataIndex: "name",
      key: "name",
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string, record: any) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            style={{ backgroundColor: record.role === "ADMIN" ? "#f5222d" : "#3b82f6" }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#fff", fontWeight: 700 }}>{text}</span>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px" }}>{record.username}</span>
          </div>
        </Space>
      ),
    },
    {
      title: "الدور",
      dataIndex: "role",
      key: "role",
      filters: [
        { text: 'مشرف', value: 'ADMIN' },
        { text: 'مستخدم', value: 'USER' },
      ],
      onFilter: (value: any, record: any) => record.role === value,
      sorter: (a: any, b: any) => a.role.localeCompare(b.role),
      render: (role: string) => (
        <Tag color={role === "ADMIN" ? "volcano" : "blue"} icon={<SafetyCertificateOutlined />}>
          {role === "ADMIN" ? "مشرف" : "مستخدم"}
        </Tag>
      ),
    },
    {
      title: "تاريخ الإنشاء",
      dataIndex: "createdAt",
      key: "createdAt",
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: 'descend' as const,
      render: (date: string) => new Date(date).toLocaleDateString("en-GB"),
    },
    {
      title: "إجراءات",
      key: "actions",
      render: (record: any) => (
        <Space>
          <Tooltip title="تغيير كلمة المرور">
            <Button 
              icon={<KeyOutlined />} 
              onClick={() => {
                setEditingUser(record);
                setIsPasswordModalOpen(true);
              }}
              style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "#fff" }}
            />
          </Tooltip>
          <Tooltip title="حذف المستخدم">
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => {
                modal.confirm({
                  title: "هل أنت متأكد من حذف هذا المستخدم؟",
                  content: "لا يمكن التراجع عن هذا الإجراء.",
                  okText: "نعم، احذف",
                  cancelText: "إلغاء",
                  okType: "danger",
                  centered: true,
                  onOk: () => handleDelete(record.id)
                });
              }}
              disabled={record.username === "admin"}
              style={{ background: "rgba(255,77,79,0.1)", border: "none" }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredData = users.filter(u => 
    u.name.toLowerCase().includes(searchText.toLowerCase()) || 
    u.username.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="users-list-wrapper">
      {contextHolder}

      <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
        <Input
          placeholder="بحث في المستخدمين..."
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
        dataSource={filteredData.map(u => ({ ...u, key: u.id }))}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `عرض ${range[0]}-${range[1]} من أصل ${total} مستخدم`
        }}
        className="custom-antd-table"
      />

      <Modal
        title={`تغيير كلمة مرور: ${editingUser?.name}`}
        open={isPasswordModalOpen}
        onCancel={() => setIsPasswordModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        okText="تحديث كلمة المرور"
        cancelText="إلغاء"
        styles={{ body: { borderRadius: 20 } }}
      >
        <Form form={form} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 20 }}>
          <Form.Item
            name="password"
            label="كلمة المرور الجديدة"
            rules={[{ required: true, message: "يرجى إدخال كلمة المرور" }]}
          >
            <Input.Password placeholder="••••••••" size="large" />
          </Form.Item>
        </Form>
      </Modal>

      <style jsx>{`
        .users-list-wrapper {
          background: rgba(20, 22, 31, 0.4);
          border-radius: 24px;
          padding: 24px;
          border: 1px solid rgba(255,255,255,0.05);
        }

        :global(.custom-antd-table .ant-table) {
          background: transparent !important;
          color: #fff !important;
        }

        :global(.custom-antd-table .ant-table-thead > tr > th) {
          background: rgba(255, 255, 255, 0.03) !important;
          color: rgba(255, 255, 255, 0.45) !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }

        :global(.custom-antd-table .ant-table-tbody > tr > td) {
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }

        :global(.custom-antd-table .ant-table-tbody > tr:hover > td) {
          background: rgba(59, 130, 246, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
