import React from "react";
import GroupManager from "@/components/admin/GroupManager";

export const metadata = {
  title: "إدارة المجموعات | نظام المدرس",
};

export default function GroupsPage() {
  return (
    <div className="groups-page">
      <GroupManager />
    </div>
  );
}
