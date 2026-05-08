import { db } from "./db";

export async function getErpSettings() {
  const settings = await db.setting.findMany({
    where: { key: { in: ["erpnext_base_url", "erpnext_endpoint", "erpnext_token"] } },
  });
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    baseUrl: (map["erpnext_base_url"] || "").replace(/\/$/, ""),
    endpoint: map["erpnext_endpoint"] || "coordinators_access",
    token: map["erpnext_token"] || "",
  };
}
