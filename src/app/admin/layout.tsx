"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import AntdConfig from "@/components/AntdConfig";
import { Layout, Menu, Avatar, Flex, Typography, Button, Space, Drawer } from "antd";
import { 
  DashboardOutlined, 
  UserOutlined, 
  FolderOpenOutlined, 
  FileTextOutlined, 
  DatabaseOutlined, 
  TeamOutlined, 
  ScanOutlined, 
  SettingOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  SunOutlined,
  MoonOutlined,
  HistoryOutlined
} from "@ant-design/icons";

const { Sider, Content, Header } = Layout;
const { Text, Title } = Typography;

const NAV_ITEMS = [
  { key: "/admin",              label: "لوحة التحكم",       icon: <DashboardOutlined /> },
  { key: "/admin/users",         label: "إدارة المستخدمين",  icon: <UserOutlined /> },
  { key: "/admin/categories",    label: "تصنيفات الملفات",   icon: <FolderOpenOutlined /> },
  { key: "/admin/files",         label: "إدارة الملفات",     icon: <FileTextOutlined /> },
  { key: "/admin/assessments",   label: "رصد الدرجات",       icon: <DatabaseOutlined /> },
  { key: "/admin/assessments/logs", label: "سجل الرصد",      icon: <HistoryOutlined /> },
  { key: "/admin/groups",        label: "المجموعات",         icon: <TeamOutlined /> },
  { key: "/admin/scan",          label: "كاشف التسريبات",    icon: <ScanOutlined /> },
  { key: "/admin/settings",      label: "الإعدادات",         icon: <SettingOutlined /> },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isReady, setIsReady] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [isDark, setIsDark] = React.useState(false);
  const [mobileVisible, setMobileVisible] = React.useState(false);

  const activeKey = pathname === "/admin" ? "/admin" : pathname.replace(/\/$/, "");

  React.useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const userRole = localStorage.getItem("user_role");

    if (!userId || userRole !== "ADMIN") {
      router.replace("/");
      return;
    }

    // Verify session against DB to prevent 403 errors
    fetch(`/api/users/${userId}`).then(res => {
      if (!res.ok) {
        localStorage.clear();
        router.replace("/");
      }
    });

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setIsDark(savedTheme === "dark");
    }
    setIsReady(true);
  }, [router]);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const sidebarContent = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "24px", textAlign: "center" }}>
        <img 
          src={isDark ? "/logo.png" : "/logo-black.png"} 
          onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png" }}
          alt="Logo" 
          style={{ width: collapsed ? 32 : 60, transition: "width 0.3s", marginBottom: 16 }} 
        />
        {!collapsed && (
          <div className="animate-fade">
            <Title level={4} style={{ color: "var(--text-main)", margin: 0, fontWeight: 800 }}>لوحة الإشراف</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>نظام الإدارة الذكي</Text>
          </div>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[activeKey]}
        style={{ borderRight: 0, background: "transparent", flex: 1 }}
        items={NAV_ITEMS}
        onClick={({ key }) => {
          router.push(key);
          if (mobileVisible) setMobileVisible(false);
        }}
      />

      <div style={{ padding: "16px" }}>
        <Button 
          danger 
          type="text" 
          block 
          icon={<LogoutOutlined />} 
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/";
          }}
          style={{ 
            height: 45, 
            borderRadius: 12, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: collapsed ? "center" : "flex-start",
            paddingLeft: collapsed ? 0 : 20 
          }}
        >
          {!collapsed && "تسجيل الخروج"}
        </Button>
      </div>
    </div>
  );

  const sidebarWidth = collapsed ? 80 : 280;

  return (
    <AntdConfig isDark={isDark}>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          width={280}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          collapsible
          trigger={null}
          breakpoint="lg"
          style={{
            background: "var(--surface)",
            borderLeft: "1px solid var(--border)",
            position: "fixed",
            height: "100vh",
            right: 0,
            zIndex: 1000,
          }}
          className="desktop-sider"
        >
          {sidebarContent}
        </Sider>

        <Drawer
          placement="right"
          onClose={() => setMobileVisible(false)}
          open={mobileVisible}
          styles={{ body: { padding: 0, background: "var(--surface)" } }}
          width={280}
          closable={false}
        >
          <div style={{ height: "100%" }}>{sidebarContent}</div>
        </Drawer>

        <Layout style={{ 
          marginRight: sidebarWidth, 
          transition: "margin-right 0.2s",
          background: "var(--bg)",
          // RESTORE THE CSS VARIABLE FOR CHILDREN (PdfPositioner, etc)
          "--sidebar-width": `${sidebarWidth}px`
        } as React.CSSProperties}>
          <div className="mobile-header">
             <Button 
              type="text" 
              icon={<MenuUnfoldOutlined style={{ color: "var(--text-main)", fontSize: 20 }} />} 
              onClick={() => setMobileVisible(true)}
            />
            <Title level={5} style={{ color: "var(--text-main)", margin: 0 }}>نظام التسريبات</Title>
            <Button 
              shape="circle" 
              icon={isDark ? <SunOutlined /> : <MoonOutlined />} 
              onClick={() => setIsDark(!isDark)}
            />
          </div>

          <Header className="desktop-header" style={{ 
            background: "transparent", 
            padding: "0 40px", 
            height: 80, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between" 
          }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 18, color: "var(--text-main)" }}
            />
            
            <Space size={24}>
              <Button 
                shape="circle" 
                size="large"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />} 
                onClick={() => setIsDark(!isDark)}
              />
              <Flex align="center" gap={12} style={{ background: "var(--elevated)", padding: "4px 16px", borderRadius: 50, border: "1px solid var(--border)" }}>
                <Flex vertical align="flex-end">
                  <Text strong style={{ lineHeight: 1 }}>المشرف الرئيسي</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>معرف: ADMIN_001</Text>
                </Flex>
                <Avatar icon={<UserOutlined />} style={{ background: "var(--accent)" }} />
              </Flex>
            </Space>
          </Header>

          <Content style={{ padding: "0 40px 40px", overflow: "initial" }}>
            <div className="animate-fade">
              {/* Ensure children render immediately if ready to avoid state loss */}
              {isReady && children}
            </div>
          </Content>
        </Layout>
      </Layout>

      <style jsx global>{`
        .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 12px !important;
          width: calc(100% - 24px) !important;
          transition: all 0.2s ease !important;
        }
        .ant-menu-item:not(.ant-menu-item-selected):active,
        .ant-menu-item:not(.ant-menu-item-selected):focus {
          background: transparent !important;
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
          .desktop-sider { display: none !important; }
          .ant-layout { marginRight: 0 !important; }
          .mobile-header { display: flex; }
          .desktop-header { display: none !important; }
        }
        .animate-fade { animation: fadeUp 0.6s ease-out; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </AntdConfig>
  );
}
