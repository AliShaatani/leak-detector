"use client";

import React from "react";
import Link from "next/link";
import { LayoutDashboard, Users, FileText, Settings, LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import AntdConfig from "@/components/AntdConfig";
import { Layout, Menu, Avatar, Flex, Typography, Button, Space, Drawer } from "antd";
import { FolderOpenOutlined, TeamOutlined, ScanOutlined, DatabaseOutlined } from "@ant-design/icons";

const { Sider, Content, Header } = Layout;
const { Text, Title } = Typography;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileVisible, setMobileVisible] = React.useState(false);
  
  // Initialize theme from localStorage if available, default to dark
  const [isDark, setIsDark] = React.useState(True); 
  const [isReady, setIsReady] = React.useState(false);

  // Sync theme and check auth
  React.useEffect(() => {
    // Auth Check
    const userId = localStorage.getItem("user_id");
    const userRole = localStorage.getItem("user_role");

    if (!userId || userRole !== "ADMIN") {
      router.replace("/");
      return;
    }

    // Theme Check
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
    
    setIsReady(true);
  }, [router]);

  // Update theme on change
  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const navItems = [
    { key: "/admin", label: "لوحة التحكم", icon: <LayoutDashboard size={18} /> },
    { key: "/admin/users", label: "إدارة المستخدمين", icon: <Users size={18} /> },
    { key: "/admin/categories", label: "تصنيفات الملفات", icon: <FolderOpenOutlined size={18} /> },
    { key: "/admin/files", label: "إدارة الملفات", icon: <FileText size={18} /> },
    { key: "/admin/assessments", label: "رصد الدرجات", icon: <DatabaseOutlined style={{ fontSize: 18 }} /> },
    { key: "/admin/groups", label: "المجموعات", icon: <TeamOutlined style={{ fontSize: 18 }} /> },
    { key: "/admin/scan", label: "كاشف التسريبات", icon: <ScanOutlined style={{ fontSize: 18 }} /> },
    { key: "/admin/settings", label: "الإعدادات", icon: <Settings size={18} /> },
  ];

  const sidebarContent = (forceShowLabels = false) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "0 24px 40px", textAlign: "center" }}>
        <img 
          src={isDark ? "/logo.png" : "/logo-black.png"} 
          onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png" }}
          alt="Logo" 
          style={{ width: 60, height: "auto", marginBottom: 16, marginTop: 10 }} 
        />
        <Title level={4} style={{ color: "var(--text-main)", margin: 0, fontWeight: 800 }}>لوحة الإشراف</Title>
        <Text type="secondary" style={{ fontSize: 12, color: "var(--text-dim)" }}>نظام الإدارة الذكي</Text>
      </div>

      <div style={{ padding: "0 12px", flex: 1 }}>
        {navItems.map((item) => (
          <Link key={item.key} href={item.key} onClick={() => setMobileVisible(false)}>
            <div className={`custom-nav-item ${pathname === item.key ? "active" : ""}`}>
              {item.icon}
              {(forceShowLabels || !collapsed) && <span>{item.label}</span>}
            </div>
          </Link>
        ))}
      </div>

      <div style={{ padding: "20px 12px 40px" }}>
        <Link href="/" onClick={() => localStorage.clear()}>
          <div className="custom-nav-item logout">
            <LogOut size={18} />
            {(forceShowLabels || !collapsed) && <span>تسجيل الخروج</span>}
          </div>
        </Link>
      </div>
    </div>
  );

  // Still render the layout structure even if not ready to prevent jumping/flickering
  // But hide children until auth is confirmed
  return (
    <AntdConfig isDark={isDark}>
      <Layout style={{ minHeight: "100vh", background: "var(--bg)", transition: "background 0.3s ease" }}>
        {/* Mobile Header */}
        <div className="mobile-header">
           <Button 
            type="text" 
            icon={<ScanOutlined style={{ color: "var(--text-main)" }} />} 
            onClick={() => setMobileVisible(true)}
            style={{ fontSize: 24, width: 50, height: 50 }}
          />
          <Title level={5} style={{ color: "var(--text-main)", margin: 0 }}>نظام التسريبات</Title>
          <Button 
            shape="circle" 
            icon={isDark ? "☀️" : "🌙"} 
            onClick={() => setIsDark(!isDark)}
          />
        </div>

        {/* Desktop Sider */}
        <Sider
          width={280}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          collapsedWidth="80"
          style={{
            background: "var(--surface)",
            borderLeft: "1px solid var(--border)",
            padding: "24px 0",
            position: "fixed",
            height: "100vh",
            right: 0,
            zIndex: 1000,
            backdropFilter: "blur(20px)",
            transition: "width 0.3s ease, background 0.3s ease, margin 0.3s ease",
          }}
          className="desktop-sider"
        >
          {sidebarContent()}
        </Sider>

        {/* Mobile Sider (Drawer) */}
        <Drawer
          placement="right"
          onClose={() => setMobileVisible(false)}
          open={mobileVisible}
          styles={{ body: { padding: 0, background: "var(--surface)" } }}
          width={280}
          closable={false}
        >
          <div style={{ padding: "24px 0", height: "100%", position: "relative" }}>
            {sidebarContent(true)}
          </div>
        </Drawer>

        <Layout className="main-layout-container" style={{ 
          marginRight: collapsed ? 80 : 280, 
          "--sidebar-width": collapsed ? "80px" : "280px",
          transition: "margin-right 0.2s cubic-bezier(0.645, 0.045, 0.355, 1), background 0.3s ease",
          background: "transparent" 
        } as React.CSSProperties}>
          <Header className="desktop-header" style={{ 
            background: "transparent", 
            padding: "0 40px", 
            height: 100, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "flex-end" 
          }}>
            <Space size={24}>
              <Button 
                shape="circle" 
                size="large"
                style={{ background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--text-main)" }}
                icon={isDark ? "☀️" : "🌙"} 
                onClick={() => setIsDark(!isDark)}
              />
              <Flex align="center" gap={12} className="user-badge">
                <Flex vertical align="flex-end" gap={0}>
                  <Text strong style={{ color: "var(--text-main)", lineHeight: 1 }}>المشرف الرئيسي</Text>
                  <Text type="secondary" style={{ fontSize: 11, color: "var(--text-dim)" }}>معرف: ADMIN_001</Text>
                </Flex>
                <Avatar size={40} style={{ background: "var(--accent)", fontWeight: 800 }}>A</Avatar>
              </Flex>
            </Space>
          </Header>

          <Content className="main-content" style={{ padding: "0 40px 40px" }}>
            <div className="animate-fade">
              {isReady ? children : <div style={{ height: "50vh" }} />}
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
          color: var(--text-dim);
          transition: all 0.3s ease;
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
        }

        .custom-nav-item:hover {
          color: var(--text-main);
          background: var(--border);
        }

        .custom-nav-item.active {
          color: #fff;
          background: var(--accent);
          box-shadow: 0 4px 12px var(--accent-glow);
        }

        .user-badge {
          background: var(--elevated);
          padding: 6px 16px;
          border-radius: 50px;
          border: 1px solid var(--border);
        }

        .mobile-header {
          display: none;
          position: fixed;
          top: 0;
          right: 0;
          left: 0;
          height: 64px;
          background: var(--glass);
          backdrop-filter: blur(10px);
          z-index: 900;
          padding: 0 16px;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
        }

        @media (max-width: 992px) {
          .desktop-sider {
            display: none !important;
          }
          .main-layout-container {
            margin-right: 0 !important;
            padding-top: 64px;
          }
          .mobile-header {
            display: flex;
          }
          .desktop-header {
            display: none !important;
          }
          .main-content {
            padding: 20px !important;
          }
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
