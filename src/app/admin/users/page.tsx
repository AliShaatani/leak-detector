import React from "react";
import { db } from "@/lib/db";
import UsersHeader from "@/components/admin/UsersHeader";
import UsersList from "@/components/admin/UsersList";

export default async function UsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="users-page" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <UsersHeader />
      
      <div style={{ marginTop: 32 }}>
        <UsersList initialUsers={JSON.parse(JSON.stringify(users))} />
      </div>
    </div>
  );
}
