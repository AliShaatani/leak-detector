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
          borderRadius: 12,
          colorBgBase: isDark ? "#0a0a14" : "#f8fafc",
          colorBgContainer: isDark ? "#141422" : "#ffffff",
          fontFamily: "inherit",
          colorTextBase: isDark ? "#f1f1f9" : "#0f172a",
        },
        components: {
          Modal: { 
            contentBg: isDark ? "#141422" : "#ffffff", 
            headerBg: isDark ? "#141422" : "#ffffff" 
          },
          Table: {
            headerBg: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            rowHoverBg: isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(59, 130, 246, 0.05)",
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
