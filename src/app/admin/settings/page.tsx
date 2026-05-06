"use client";

import React, { useState, useEffect } from "react";
import { Card, Form, Input, Button, Typography, Space, Flex, Divider, Alert, App, Tag } from "antd";
import { LockOutlined, SaveOutlined, SecurityScanOutlined, BellOutlined, GlobalOutlined, ApiOutlined, CheckCircleOutlined, CloseCircleOutlined, BarcodeOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Title, Text } = Typography;

export default function SettingsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [erpLoading, setErpLoading] = useState(false);
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "ok" | "fail">("idle");
  const [barcodeScale, setBarcodeScale] = useState(100);
  const [form] = Form.useForm();
  const [erpForm] = Form.useForm();

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        erpForm.setFieldsValue({
          erpnext_base_url: data.erpnext_base_url || "portal.mia.edu.ly",
          erpnext_endpoint: data.erpnext_endpoint || "education.coordinators_access",
          erpnext_token: data.erpnext_token || "8794bbb8a1b5690:89f7d362a58babb",
        });
        setBarcodeScale(data.barcode_scale ? parseInt(data.barcode_scale, 10) : 100);
      });
  }, []);

  const handlePasswordChange = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) { message.success("تم تحديث كلمة المرور بنجاح"); form.resetFields(); }
      else { const d = await res.json(); message.error(d.error || "فشل تحديث كلمة المرور"); }
    } catch { message.error("خطأ في الاتصال بالسيرفر"); }
    finally { setLoading(false); }
  };

  const handleErpSave = async (values: any) => {
    setErpLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) message.success("تم حفظ إعدادات ERPNext بنجاح");
      else message.error("فشل حفظ الإعدادات");
    } catch { message.error("خطأ في الاتصال"); }
    finally { setErpLoading(false); }
  };

  const handleBarcodeSave = async () => {
    setBarcodeLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode_scale: String(barcodeScale) }),
      });
      if (res.ok) message.success(`تم حفظ حجم الباركود: ${barcodeScale}%`);
      else message.error("فشل حفظ الإعداد");
    } catch { message.error("خطأ في الاتصال"); }
    finally { setBarcodeLoading(false); }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestStatus("idle");
    try {
      const res = await fetch("/api/erpnext?method=exam_points");
      const data = await res.json();
      const inner = data.message || data;
      if (inner?.status === "success") {
        setTestStatus("ok");
        message.success(`الاتصال ناجح — ${inner?.data?.length || 0} قاعة اختبار متاحة`);
      } else {
        setTestStatus("fail");
        message.error("فشل الاتصال: " + (inner?.message || data.error || "خطأ غير معروف"));
      }
    } catch { setTestStatus("fail"); message.error("تعذّر الوصول إلى ERPNext"); }
    finally { setTestLoading(false); }
  };

  return (
    <div className="settings-container">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Flex justify="space-between" align="center" style={{ marginBottom: 32 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: "#fff", fontWeight: 900 }}>الإعدادات</Title>
            <Text type="secondary">تخصيص النظام وإدارة معايير الأمان</Text>
          </div>
        </Flex>

        <Flex gap={24} vertical>
          {/* Barcode Scale */}
          <Card
            title={<Space><BarcodeOutlined style={{ color: "#a78bfa" }} />حجم الباركود العام</Space>}
            className="settings-card"
          >
            <Alert
              message="تأثير على جميع المستندات"
              description="هذا الإعداد يضرب في حجم الباركود لكل مستند. القيمة الافتراضية 100% تحافظ على الحجم الأصلي."
              type="info" showIcon style={{ marginBottom: 24, borderRadius: 12 }}
            />
            <div style={{ padding: "0 8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <Text style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>حجم الباركود</Text>
                <div style={{
                  background: "linear-gradient(135deg,#a78bfa,#7c3aed)",
                  color: "#fff", fontWeight: 800, fontSize: 18,
                  padding: "4px 16px", borderRadius: 50, minWidth: 72, textAlign: "center"
                }}>
                  {barcodeScale}%
                </div>
              </div>
              <input
                type="range" min={25} max={300} step={5}
                value={barcodeScale}
                onChange={e => setBarcodeScale(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#7c3aed", height: 6, cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>25%</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>100% (افتراضي)</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>300%</Text>
              </div>

              {/* Live preview */}
              <div style={{
                marginTop: 24, padding: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{
                  padding: "6px 12px", borderRadius: 4,
                  width: `${Math.round(180 * barcodeScale / 100)}px`,
                  maxWidth: "100%",
                  height: `${Math.round(40 * barcodeScale / 100)}px`,
                  background: "white repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 5px)",
                  transition: "all 0.2s",
                }} />
              </div>
              <Text type="secondary" style={{ display: "block", textAlign: "center", marginTop: 8, fontSize: 12 }}>
                معاينة تقريبية للحجم
              </Text>

              <Button
                type="primary" onClick={handleBarcodeSave} loading={barcodeLoading}
                icon={<SaveOutlined />}
                style={{ marginTop: 20, height: 44, borderRadius: 10, fontWeight: 700, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", width: "100%" }}
              >
                حفظ حجم الباركود
              </Button>
            </div>
          </Card>

          {/* ERPNext Integration */}
          <Card
            title={<Space><ApiOutlined style={{ color: "#f59e0b" }} />تكامل ERPNext</Space>}
            className="settings-card"
            extra={
              testStatus === "ok" ? <Tag color="success" icon={<CheckCircleOutlined />}>متصل</Tag> :
              testStatus === "fail" ? <Tag color="error" icon={<CloseCircleOutlined />}>فشل الاتصال</Tag> : null
            }
          >
            <Alert
              message="إعدادات مشتركة لجميع المستخدمين"
              description="هذه الإعدادات تُطبَّق على جميع مستخدمي لوحة التحكم. بعد الحفظ يمكن للمستخدمين البحث عن الطلاب وتعديل قاعة الامتحان مباشرة."
              type="warning" showIcon style={{ marginBottom: 24, borderRadius: 12 }}
            />
            <Form form={erpForm} layout="vertical" onFinish={handleErpSave} size="large">
              <Flex gap={24}>
                <Form.Item label="رابط النظام (Base URL)" name="erpnext_base_url" rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input prefix={<GlobalOutlined />} placeholder="portal.mia.edu.ly" className="erp-input" />
                </Form.Item>
                <Form.Item label="نقطة الوصول (Endpoint)" name="erpnext_endpoint" rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input prefix={<ApiOutlined />} placeholder="coordinators_access" className="erp-input" />
                </Form.Item>
              </Flex>
              <Form.Item label="مفتاح API : Secret (token)" name="erpnext_token" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined />} placeholder="api_key:api_secret" className="erp-input" />
              </Form.Item>
              <Flex gap={12}>
                <Button type="primary" htmlType="submit" loading={erpLoading} icon={<SaveOutlined />}
                  style={{ borderRadius: 10, height: 44, fontWeight: 700, background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none" }}>
                  حفظ الإعدادات
                </Button>
                <Button onClick={handleTestConnection} loading={testLoading} icon={<ApiOutlined />}
                  style={{ borderRadius: 10, height: 44, fontWeight: 700 }}>
                  اختبار الاتصال
                </Button>
              </Flex>
            </Form>
          </Card>

          {/* Security */}
          <Card title={<Space><SecurityScanOutlined />إدارة الأمان</Space>} className="settings-card">
            <Alert message="تنبيه الأمان" description="تأكد من اختيار كلمة مرور قوية تحتوي على حروف وأرقام." type="info" showIcon style={{ marginBottom: 24, borderRadius: 12 }} />
            <Form form={form} layout="vertical" onFinish={handlePasswordChange} size="large">
              <Flex gap={24}>
                <Form.Item label="كلمة المرور الحالية" name="currentPassword" rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                </Form.Item>
                <Form.Item label="كلمة المرور الجديدة" name="newPassword" rules={[{ required: true }]} style={{ flex: 1 }}>
                  <Input.Password prefix={<LockOutlined />} placeholder="••••••••" />
                </Form.Item>
              </Flex>
              <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} style={{ borderRadius: 10, height: 44, fontWeight: 700 }}>
                  تحديث كلمة المرور
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Flex gap={24}>
            <Card title={<Space><GlobalOutlined />التفضيلات</Space>} className="settings-card" style={{ flex: 1 }}>
              <Text type="secondary">لغة النظام: العربية (افتراضي)</Text>
              <Divider style={{ margin: "16px 0" }} />
              <Text type="secondary">المنطقة الزمنية: (GMT+02:00) Cairo</Text>
            </Card>
            <Card title={<Space><BellOutlined />التنبيهات</Space>} className="settings-card" style={{ flex: 1 }}>
              <Text type="secondary">إشعارات البريد الإلكتروني: مفعلة</Text>
              <Divider style={{ margin: "16px 0" }} />
              <Text type="secondary">إشعارات النظام: مفعلة</Text>
            </Card>
          </Flex>
        </Flex>
      </motion.div>

      <style jsx global>{`
        .settings-card { background: rgba(20,22,31,0.4) !important; border: 1px solid rgba(255,255,255,0.05) !important; border-radius: 24px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important; }
        .ant-card-head { border-bottom: 1px solid rgba(255,255,255,0.05) !important; padding: 0 24px !important; }
        .ant-card-head-title { color: #fff !important; font-weight: 700 !important; font-size: 16px !important; }
        .ant-form-item-label label { color: rgba(255,255,255,0.6) !important; font-weight: 600 !important; }
        .ant-input-affix-wrapper, .erp-input { background: rgba(0,0,0,0.2) !important; border-color: rgba(255,255,255,0.1) !important; border-radius: 12px !important; }
        .ant-input-affix-wrapper:hover, .ant-input-affix-wrapper-focused { border-color: #f59e0b !important; }
        .ant-input { background: transparent !important; color: #fff !important; }
      `}</style>
    </div>
  );
}
