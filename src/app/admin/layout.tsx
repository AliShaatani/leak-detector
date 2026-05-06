"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, Users, FileText, Settings, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import AntdConfig from "@/components/AntdConfig";
import { Layout, Menu, Avatar, Flex, Typography, Button, Space } from "antd";
import { FolderOpenOutlined, TeamOutlined, ScanOutlined } from "@ant-design/icons";

const { Sider, Content, Header } = Layout;
const { Text, Title } = Typography;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { key: "/admin", label: "لوحة التحكم", icon: <LayoutDashboard size={18} /> },
    { key: "/admin/users", label: "إدارة المستخدمين", icon: <Users size={18} /> },
    { key: "/admin/categories", label: "تصنيفات الملفات", icon: <FolderOpenOutlined size={18} /> },
    { key: "/admin/files", label: "إدارة الملفات", icon: <FileText size={18} /> },
    { key: "/admin/groups", label: "المجموعات", icon: <TeamOutlined style={{ fontSize: 18 }} /> },
    { key: "/admin/scan", label: "كاشف التسريبات", icon: <ScanOutlined style={{ fontSize: 18 }} /> },
    { key: "/admin/settings", label: "الإعدادات", icon: <Settings size={18} /> },
  ];

  return (
    <AntdConfig>
      <Layout style={{ minHeight: "100vh", background: "#080a0f" }}>
        <Sider
          width={280}
          style={{
            background: "rgba(12, 14, 22, 0.8)",
            borderLeft: "1px solid rgba(255, 255, 255, 0.05)",
            padding: "24px 0",
            position: "fixed",
            height: "100vh",
            right: 0,
            zIndex: 100,
            backdropFilter: "blur(20px)"
          }}
        >
          <div style={{ padding: "0 24px 40px", textAlign: "center" }}>
            <img src="/logo.png" alt="Logo" style={{ width: 80, marginBottom: 16 }} />
            <Title level={4} style={{ color: "#fff", margin: 0, fontWeight: 800 }}>لوحة الإشراف</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>نظام الإدارة الذكي</Text>
          </div>

          <div style={{ padding: "0 12px" }}>
            {navItems.map((item) => (
              <Link key={item.key} href={item.key}>
                <div className={`custom-nav-item ${pathname === item.key ? "active" : ""}`}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ position: "absolute", bottom: 40, width: "100%", padding: "0 12px" }}>
            <Link href="/">
              <div className="custom-nav-item logout">
                <LogOut size={18} />
                <span>تسجيل الخروج</span>
              </div>
            </Link>
          </div>
        </Sider>

        <Layout style={{ marginRight: 280, background: "transparent" }}>
          <Header style={{ 
            background: "transparent", 
            padding: "0 40px", 
            height: 100, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "flex-end" 
          }}>
            <Flex align="center" gap={12} className="user-badge">
              <Flex vertical align="flex-end" gap={0}>
                <Text strong style={{ color: "#fff", lineHeight: 1 }}>المشرف الرئيسي</Text>
                <Text type="secondary" style={{ fontSize: 11 }}>ID: ADMIN_001</Text>
              </Flex>
              <Avatar size={40} style={{ background: "#3b82f6", fontWeight: 800 }}>A</Avatar>
            </Flex>
          </Header>

          <Content style={{ padding: "0 40px 40px" }}>
            <div className="animate-fade">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>

      <style jsx global>{`
        .custom-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 14px;
          color: rgba(255, 255, 255, 0.45);
          transition: all 0.3s ease;
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .custom-nav-item:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
        }

        .custom-nav-item.active {
          color: #fff;
          background: #3b82f6;
          box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
        }

        .custom-nav-item.logout:hover {
          color: #ff4d4f;
          background: rgba(255, 77, 79, 0.1);
        }

        .user-badge {
          background: rgba(255, 255, 255, 0.03);
          padding: 6px 16px;
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .animate-fade {
          animation: fadeUp 0.6s ease-out;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AntdConfig>
  );
}
