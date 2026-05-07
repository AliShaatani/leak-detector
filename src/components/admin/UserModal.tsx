"use client";

import React, { useState } from "react";
import { Modal, Form, Input, Select, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function UserModal({ isOpen, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      
      if (res.ok) {
        message.success("تم إنشاء المستخدم بنجاح");
        form.resetFields();
        onCreated();
        onClose();
      } else {
        const data = await res.json();
        message.error(data.error || "فشل إنشاء المستخدم");
      }
    } catch (err) {
      message.error("خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="إضافة مستخدم جديد"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={480}
      styles={{
        body: { borderRadius: 24, padding: "24px 32px" }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ role: "USER" }}
        style={{ marginTop: 24 }}
      >
        <Form.Item
          label="الاسم الكامل"
          name="name"
          rules={[{ required: true, message: "يرجى إدخال الاسم" }]}
        >
          <Input 
            prefix={<UserOutlined />} 
            placeholder="أدخل الاسم الثلاثي" 
            size="large"
            style={{ borderRadius: 10 }}
          />
        </Form.Item>

        <Form.Item
          label="اسم المستخدم"
          name="username"
          rules={[{ required: true, message: "يرجى إدخال اسم المستخدم" }]}
        >
          <Input 
            prefix={<UserOutlined />} 
            placeholder="مثال: ahmad_2024" 
            size="large"
            style={{ borderRadius: 10 }}
          />
        </Form.Item>

        <Form.Item
          label="كلمة المرور"
          name="password"
          rules={[{ required: true, message: "يرجى إدخال كلمة المرور" }]}
        >
          <Input.Password 
            prefix={<LockOutlined />} 
            placeholder="••••••••" 
            size="large"
            style={{ borderRadius: 10 }}
          />
        </Form.Item>

        <Form.Item
          label="الدور الوظيفي"
          name="role"
        >
          <Select size="large" style={{ borderRadius: 10 }}>
            <Select.Option value="USER">منسق قاعة</Select.Option>
            <Select.Option value="ADMIN">مشرف (إدارة)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading} 
            block 
            size="large"
            style={{ borderRadius: 12, fontWeight: 700, height: 50 }}
          >
            حفظ بيانات المستخدم
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}
