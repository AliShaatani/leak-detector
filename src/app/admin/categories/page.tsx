import React from "react";
import CategoryManager from "@/components/admin/CategoryManager";

export default function CategoriesPage() {
  return (
    <div className="categories-page">
      <div className="section-header" style={{ marginBottom: 32 }}>
        <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 800, margin: 0 }}>نظام إدارة التصنيفات</h1>
        <p style={{ color: "rgba(255,255,255,0.45)", margin: "8px 0 0" }}>
          نظم ملفاتك في هيكلية شجرية لسهولة التوزيع والتتبع
        </p>
      </div>
      
      <CategoryManager />
    </div>
  );
}
