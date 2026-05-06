#!/usr/bin/env node
/**
 * docker-seed.js — First-run database seeder.
 * Idempotent: safe to run on every startup.
 */

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // ── Admin user (plain-text password — matches app auth logic) ─────────────
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@1234!";
  const adminName     = process.env.ADMIN_NAME     || "المشرف الرئيسي";

  const existing = await db.user.findUnique({ where: { username: adminUsername } });
  if (!existing) {
    await db.user.create({
      data: {
        username:  adminUsername,
        password:  adminPassword,   // plain text — app compares directly
        name:      adminName,
        role:      "ADMIN",
        displayId: "0000-001",
      },
    });
    console.log(`✅ Admin user created: ${adminUsername}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminUsername}`);
  }

  // ── Default settings ──────────────────────────────────────────────────────
  const defaults = [
    { key: "erpnext_base_url", value: process.env.ERPNEXT_BASE_URL || "portal.mia.edu.ly" },
    { key: "erpnext_endpoint", value: process.env.ERPNEXT_ENDPOINT || "education.coordinators_access" },
    { key: "erpnext_token",    value: process.env.ERPNEXT_TOKEN    || "" },
    { key: "barcode_scale",    value: process.env.BARCODE_SCALE_DEFAULT || "100" },
  ];

  for (const s of defaults) {
    await db.setting.upsert({
      where:  { key: s.key },
      create: s,
      update: {},   // don't overwrite if already customised
    });
    console.log(`⚙️  Setting: ${s.key}`);
  }

  console.log("✅ Seed complete.");
  await db.$disconnect();
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  db.$disconnect();
  process.exit(1);
});
