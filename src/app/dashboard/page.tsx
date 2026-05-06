import React from "react";
import { db } from "@/lib/db";
import DashboardContent from "@/components/dashboard/DashboardContent";

export default function UserDashboard() {
  return (
    <div className="user-dashboard-page">
      <DashboardContent />
    </div>
  );
}
