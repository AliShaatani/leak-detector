"use client";

import React from "react";
import { ConfigProvider, App, theme } from "antd";
import locale from "antd/locale/ar_EG";

export default function AntdConfig({ children, isDark = true }: { children: React.ReactNode, isDark?: boolean }) {
  return (
    <ConfigProvider
      direction="rtl"
      locale={locale}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          borderRadius: 14,
          colorBgBase: isDark ? "#0a0a14" : "#f8fafc",
          colorBgContainer: isDark ? "#141422" : "#ffffff",
          fontFamily: "var(--font-cairo), 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          colorTextBase: isDark ? "#f1f1f9" : "#0f172a",
        },
        components: {
          Message: {
            contentPadding: "12px 24px",
            borderRadiusLG: 16,
            // Use variables so it perfectly follows the theme
            contentBg: isDark ? "var(--elevated)" : "#ffffff",
          },
          Modal: { 
            contentBg: isDark ? "var(--surface)" : "#ffffff", 
            headerBg: isDark ? "var(--surface)" : "#ffffff",
            borderRadiusLG: 24,
          },
          Table: {
            headerBg: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            rowHoverBg: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)",
          },
          Alert: {
            borderRadiusLG: 16,
            colorInfoBg: isDark ? "var(--elevated)" : "#e6f7ff",
            colorErrorBg: isDark ? "rgba(239, 68, 68, 0.1)" : "#fff1f0",
            colorSuccessBg: isDark ? "rgba(16, 185, 129, 0.1)" : "#f6ffed",
          }
        },
      }}
    >
      <App style={{ fontFamily: "inherit" }}>{children}</App>
    </ConfigProvider>
  );
}
