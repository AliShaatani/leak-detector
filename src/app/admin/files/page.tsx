import React from "react";
import { FilePlus, FileText, Trash2, MapPin, Share2 } from "lucide-react";
import { db } from "@/lib/db";
import Link from "next/link";

import FilesHeader from "@/components/admin/FilesHeader";

import FilesList from "@/components/admin/FilesList";

export default async function FilesPage() {
  const files = await db.document.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="files-page">
      <FilesHeader />
      <FilesList initialFiles={files} />
    </div>
  );
}
