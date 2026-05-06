"use client";

import React, { useState } from "react";
import { Form, Input, Button, Typography, message, Flex, Alert } from "antd";
import { UserOutlined, LockOutlined, ArrowRightOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        // Store user info for UI
        localStorage.setItem("user_name", data.name);
        localStorage.setItem("user_display_id", data.displayId || "");
        localStorage.setItem("user_id", data.id);

        if (data.role === "ADMIN") {
          window.location.href = "/admin";
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        setError(data.error || "اسم المستخدم أو كلمة المرور غير صحيحة");
        setLoading(false);
      }
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
      setLoading(false);
    }
  };

  return (
    <main className="split-login-container">
      {/* Right Side: Login Form */}
      <div className="login-form-side">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="form-wrapper"
        >
          <div className="brand-header">
            <div className="brand-logo">
              <img src="/logo.png" alt="Logo" style={{ width: "120px", height: "auto", objectFit: "contain" }} />
            </div>
            <Title level={1} style={{ margin: "24px 0 8px", color: "#fff", fontWeight: 900, fontSize: "2.5rem" }}>
              نظام إدارة نماذج الامتحان
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
              خاص بكلية الإمام مالك بن أنس
            </Text>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                style={{ overflow: "hidden" }}
              >
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: 12,
                    color: "#fca5a5"
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            requiredMark={false}
            style={{ marginTop: 48 }}
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: "يرجى إدخال اسم المستخدم" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "rgba(255,255,255,0.25)" }} />}
                placeholder="اسم المستخدم"
                className="custom-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: "يرجى إدخال كلمة المرور" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.25)" }} />}
                placeholder="كلمة المرور"
                className="custom-input"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 40 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={loading}
                icon={<ArrowRightOutlined />}
                style={{
                  height: 60,
                  borderRadius: 14,
                  fontSize: 18,
                  fontWeight: 700,
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  border: "none",
                  boxShadow: "0 10px 30px rgba(59, 130, 246, 0.4)"
                }}
              >
                تسجيل الدخول للنظام
              </Button>
            </Form.Item>
          </Form>

          <div className="form-footer">
            <Text style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
              خاص بكلية الإمام مالك بن أنس - جميع الحقوق محفوظة
            </Text>
          </div>
        </motion.div>
      </div>

      {/* Left Side: Large Image */}
      <div className="login-image-side">
        <div className="image-overlay" />
        <img src="/home.jpeg" alt="Branding" className="branding-image" />
        <div className="image-content">
          <div className="glass-badge">
            <Text strong style={{ color: "#fff" }}>بوابة الإدارة الذكية</Text>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .split-login-container {
          min-height: 100vh;
          display: flex;
          background: #080a0f;
        }

        /* Right Side: Form */
        .login-form-side {
          width: 40%;
          min-width: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px;
          background: #0c0e16;
          position: relative;
          z-index: 2;
          box-shadow: 20px 0 60px rgba(0,0,0,0.5);
        }

        .form-wrapper {
          width: 100%;
          max-width: 420px;
        }

        .brand-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 48px;
        }

        .brand-logo {
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .custom-input {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 14px !important;
          padding: 14px 20px !important;
          color: #fff !important;
          height: 56px;
        }

        .custom-input:hover, .custom-input:focus {
          border-color: #3b82f6 !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .ant-input-password-icon { color: rgba(255,255,255,0.25) !important; }

        .form-footer {
          margin-top: 60px;
          padding-top: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          text-align: center;
        }

        /* Left Side: Image */
        .login-image-side {
          flex: 1;
          position: relative;
          overflow: hidden;
          background: #000;
        }

        .branding-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.7;
        }

        .image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to right, #0c0e16 0%, transparent 100%);
          z-index: 1;
        }

        .image-content {
          position: absolute;
          bottom: 60px;
          left: 60px;
          z-index: 2;
        }

        .glass-badge {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 12px 24px;
          border-radius: 50px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 1100px) {
          .login-image-side { display: none; }
          .login-form-side { width: 100%; }
        }
      `}</style>
    </main>
  );
}
