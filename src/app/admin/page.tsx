export const dynamic = "force-dynamic";
import React from "react";
import { Users, FileText, Download, Clock } from "lucide-react";
import { db } from "@/lib/db";

export default async function AdminDashboard() {
  // Fetch stats (mock for now or real if data exists)
  const userCount = await db.user.count();
  const fileCount = await db.document.count();
  const assignmentCount = await db.assignment.count();

  const stats = [
    { name: "إجمالي المستخدمين", value: userCount, icon: Users, color: "var(--accent)" },
    { name: "الملفات المرفوعة", value: fileCount, icon: FileText, color: "var(--success)" },
    { name: "التوزيعات النشطة", value: assignmentCount, icon: Clock, color: "var(--warning)" },
    { name: "عمليات التحميل", value: 0, icon: Download, color: "#a855f7" },
  ];

  return (
    <div className="dashboard-overview">
      <div className="section-header">
        <h1>لوحة التحكم العامة</h1>
        <p>نظرة عامة على حالة النظام والعمليات الحالية</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="stat-card glass">
              <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                <Icon size={24} />
              </div>
              <div className="stat-info">
                <h3>{stat.value}</h3>
                <p>{stat.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="recent-activity glass">
        <div className="card-header">
          <h2>آخر التنبيهات</h2>
        </div>
        <div className="empty-state">
          <p>لا توجد نشاطات حديثة حتى الآن</p>
        </div>
      </div>
    </div>
  );
}
