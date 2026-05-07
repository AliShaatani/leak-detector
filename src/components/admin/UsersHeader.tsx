"use client";

import React, { useState } from "react";
import { Button, Typography, Flex } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import UserModal from "./UserModal";

const { Title, Text } = Typography;

export default function UsersHeader() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: "var(--text-main)", fontWeight: 900 }}>إدارة المستخدمين</Title>
          <Text type="secondary" style={{ color: "var(--text-dim)" }}>تحكم في صلاحيات الوصول وإعدادات الحسابات</Text>
        </div>
        
        <Button 
          type="primary" 
          size="large" 
          icon={<UserAddOutlined />}
          onClick={() => setIsModalOpen(true)}
          style={{ 
            height: 50, 
            borderRadius: 12, 
            padding: "0 24px", 
            fontWeight: 700,
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            border: "none",
            boxShadow: "0 8px 20px rgba(59, 130, 246, 0.3)"
          }}
        >
          إضافة مستخدم جديد
        </Button>
      </Flex>

      <UserModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreated={() => {
          window.location.reload();
        }}
      />
    </>
  );
}
