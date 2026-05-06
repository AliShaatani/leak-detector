"use client";

import React, { useState } from "react";
import { Modal, Table, Input, Button, DatePicker, Avatar, Space, Tag, Typography, Flex, message, Tabs } from "antd";
import { SearchOutlined, FileTextOutlined, TeamOutlined, UserOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/ar";

const { Text, Title } = Typography;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  users: any[];
  groups?: any[];
  files: any[];
  onAssign: (data: { userIds: string[], groupIds: string[], fileId: string, expiry: string }) => void;
  initialAssignments?: { userAssignments: any[], groupAssignments: any[] };
}

export default function AssignmentModal({ isOpen, onClose, users, groups = [], files, onAssign, initialAssignments = { userAssignments: [], groupAssignments: [] } }: Props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedGroupKeys, setSelectedGroupKeys] = useState<React.Key[]>([]);
  const [activeTab, setActiveTab] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [expiry, setExpiry] = useState<dayjs.Dayjs | null>(dayjs().add(7, "day"));
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialAssignments.userAssignments.length > 0 || initialAssignments.groupAssignments.length > 0) {
        setSelectedRowKeys(initialAssignments.userAssignments.map(a => a.userId));
        setSelectedGroupKeys(initialAssignments.groupAssignments.map(a => a.groupId));
        
        const firstAssignment = initialAssignments.userAssignments[0] || initialAssignments.groupAssignments[0];
        setExpiry(firstAssignment ? dayjs(firstAssignment.expiry) : dayjs().add(7, "day"));
      } else {
        setSelectedRowKeys([]);
        setSelectedGroupKeys([]);
        setExpiry(dayjs().add(7, "day"));
      }
    }
  }, [isOpen, initialAssignments]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const onGroupSelectChange = (newSelectedGroupKeys: React.Key[]) => {
    setSelectedGroupKeys(newSelectedGroupKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const groupRowSelection = {
    selectedRowKeys: selectedGroupKeys,
    onChange: onGroupSelectChange,
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      title: "المستخدم",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: any) => (
        <Space>
          <Avatar 
            shape="square" 
            style={{ backgroundColor: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", fontWeight: 800 }}
          >
            {text.charAt(0)}
          </Avatar>
          <Flex vertical gap={0}>
            <Text strong style={{ color: "#fff" }}>{text}</Text>
            <Text type="secondary" style={{ fontSize: "12px" }}>@{record.username}</Text>
          </Flex>
        </Space>
      ),
    },
    {
      title: "الحالة",
      key: "status",
      render: () => <Tag color="processing">نشط</Tag>,
    }
  ];

  const groupColumns = [
    {
      title: "اسم المجموعة",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <Text strong style={{ color: "#fff" }}>{text}</Text>,
    },
    {
      title: "الحالة",
      key: "status",
      render: () => <Tag color="success">مجموعة</Tag>,
    }
  ];

  const handleSubmit = async () => {
    if (!expiry) return; // allow empty selection to remove all assignments
    
    setLoading(true);
    try {
      await onAssign({
        userIds: selectedRowKeys as string[],
        groupIds: selectedGroupKeys as string[],
        fileId: files[0]?.id || "",
        expiry: expiry.toISOString()
      });
      message.success("تم توزيع الملفات بنجاح");
      onClose();
      setSelectedRowKeys([]);
      setSelectedGroupKeys([]);
      setExpiry(null);
    } catch (err) {
      message.error("حدث خطأ أثناء التوزيع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={
        <Space style={{ padding: "10px 0" }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 12, 
            background: "rgba(59, 130, 246, 0.1)", color: "#3b82f6",
            display: "flex", alignItems: "center", justifyContent: "center" 
          }}>
            <FileTextOutlined style={{ fontSize: 20 }} />
          </div>
          <Flex vertical gap={0}>
            <Title level={4} style={{ margin: 0, color: "#fff" }}>توزيع ملفات المشروع</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>المستخدمين {">"} توزيع الملف</Text>
          </Flex>
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      width={880}
      footer={[
        <Flex key="footer" justify="space-between" align="center" style={{ width: "100%" }}>
          <Text strong style={{ color: "rgba(255,255,255,0.45)" }}>
            تم اختيار {selectedRowKeys.length} مستخدمين و {selectedGroupKeys.length} مجموعات
          </Text>
          <Space>
            <Button onClick={onClose} type="text" style={{ color: "#fff" }}>إلغاء</Button>
            <Button 
              type="primary" 
              size="large" 
              onClick={handleSubmit}
              loading={loading}
              disabled={!expiry}
              style={{ borderRadius: 10, padding: "0 30px", fontWeight: 700 }}
            >
              تحديث التوزيع
            </Button>
          </Space>
        </Flex>
      ]}
      styles={{
        mask: { backdropFilter: "blur(8px)", background: "rgba(0,0,0,0.6)" },
        body: { borderRadius: 32, padding: "32px 40px" }
      }}
    >
      <Flex vertical gap={24} style={{ width: "100%", marginTop: 24 }}>
        <Input 
          prefix={<SearchOutlined style={{ color: "#666" }} />}
          placeholder="بحث عن مستخدم..."
          size="large"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ 
            borderRadius: 50, 
            background: "rgba(0,0,0,0.2)", 
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "12px 24px"
          }}
        />

        <Flex gap={20} align="center">
          <Text strong style={{ color: "rgba(255,255,255,0.85)" }}>تاريخ انتهاء الصلاحية:</Text>
          <DatePicker 
            showTime 
            placeholder="اختر التاريخ والوقت"
            size="large"
            value={expiry}
            onChange={setExpiry}
            style={{ flex: 1, borderRadius: 12 }}
            format="YYYY-MM-DD HH:mm"
          />
        </Flex>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          centered
          items={[
            {
              key: "users",
              label: <span><UserOutlined /> المستخدمين</span>,
              children: (
                <Table 
                  rowSelection={{
                    type: "checkbox",
                    ...rowSelection,
                  }}
                  columns={columns} 
                  dataSource={filteredUsers.map(u => ({ ...u, key: u.id }))}
                  pagination={{ pageSize: 5 }}
                  scroll={{ y: 260 }}
                  style={{ marginTop: 10 }}
                />
              )
            },
            {
              key: "groups",
              label: <span><TeamOutlined /> المجموعات</span>,
              children: (
                <Table 
                  rowSelection={{
                    type: "checkbox",
                    ...groupRowSelection,
                  }}
                  columns={groupColumns} 
                  dataSource={groups.map(g => ({ ...g, key: g.id }))}
                  pagination={{ pageSize: 5 }}
                  scroll={{ y: 260 }}
                  style={{ marginTop: 10 }}
                />
              )
            }
          ]} 
        />
      </Flex>
    </Modal>
  );
}
