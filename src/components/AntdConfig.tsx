"use client";

import React from "react";
import { ConfigProvider, App, theme } from "antd";
import locale from "antd/locale/ar_EG";

export default function AntdConfig({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      direction="rtl"
      locale={locale}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          borderRadius: 12,
          colorBgBase: "#0f172a",
          colorBgContainer: "#1e293b",
          fontFamily: "inherit",
        },
        components: {
          Modal: { contentBg: "#1a1a2e", headerBg: "#1a1a2e" },
          Table: {
            headerBg: "rgba(255, 255, 255, 0.03)",
            rowHoverBg: "rgba(59, 130, 246, 0.1)",
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
