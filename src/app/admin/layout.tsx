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
  MoonOutlined
} from "@ant-design/icons";

const { Sider, Content, Header } = Layout;
const { Text, Title } = Typography;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileVisible, setMobileVisible] = React.useState(false);
  const [isDark, setIsDark] = React.useState(true); 
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const userId = localStorage.getItem("user_id");
    const userRole = localStorage.getItem("user_role");

    if (!userId || userRole !== "ADMIN") {
      router.replace("/");
      return;
    }

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

  // Ensure these paths match your folder structure exactly
  const menuItems = [
    { key: "/admin", label: "لوحة التحكم", icon: <DashboardOutlined /> },
    { key: "/admin/users", label: "إدارة المستخدمين", icon: <UserOutlined /> },
    { key: "/admin/categories", label: "تصنيفات الملفات", icon: <FolderOpenOutlined /> },
    { key: "/admin/files", label: "إدارة الملفات", icon: <FileTextOutlined /> },
    { key: "/admin/assessments", label: "رصد الدرجات", icon: <DatabaseOutlined /> },
    { key: "/admin/groups", label: "المجموعات", icon: <TeamOutlined /> },
    { key: "/admin/scan", label: "كاشف التسريبات", icon: <ScanOutlined /> },
    { key: "/admin/settings", label: "الإعدادات", icon: <SettingOutlined /> },
  ];

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
          <>
            <Title level={4} style={{ color: "var(--text-main)", margin: 0, fontWeight: 800 }}>لوحة الإشراف</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>نظام الإدارة الذكي</Text>
          </>
        )}
      </div>

      <Menu
        mode="inline"
        selectedKeys={[pathname]}
        style={{ borderRight: 0, background: "transparent", flex: 1 }}
        items={menuItems}
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
            router.replace("/");
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

  return (
    <AntdConfig isDark={isDark}>
      <Layout style={{ minHeight: "100vh" }}>
        {/* Mobile Header */}
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

        {/* Desktop Sider */}
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

        {/* Mobile Sider (Drawer) */}
        <Drawer
          placement="right"
          onClose={() => setMobileVisible(false)}
          open={mobileVisible}
          styles={{ body: { padding: 0, background: "var(--surface)" } }}
          width={280}
          closable={false}
        >
          <div style={{ height: "100%" }}>
            {sidebarContent}
          </div>
        </Drawer>

        <Layout style={{ 
          marginRight: collapsed ? 80 : 280, 
          transition: "margin-right 0.2s",
          background: "var(--bg)" 
        }}>
          <Header style={{ 
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
              {isReady ? children : <div style={{ height: "50vh" }} />}
            </div>
          </Content>
        </Layout>
      </Layout>

      <style jsx global>{`
        /* Removed custom CSS overrides that caused "sticky" grey backgrounds */
        .ant-menu-item {
          border-radius: 12px !important;
          margin: 4px 12px !important;
          width: calc(100% - 24px) !important;
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
