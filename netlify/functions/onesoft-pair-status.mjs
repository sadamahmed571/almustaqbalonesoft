import { store, json, requireCompany } from "../lib/relay-common.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId") || "";
  const code = url.searchParams.get("code") || "";
  const auth = requireCompany(req, companyId);
  if (!auth.ok) return auth.response;

  const item = await store().get(`pair/${companyId}/${code}`, { type: "json", consistency: "strong" });
  if (!item) return json({ status: "not_found" }, 404);

  if (item.status !== "paired" && Date.parse(item.expiresAt || "") < Date.now()) {
    return json({ status: "expired" });
  }
  return json({
    status: item.status || "pending",
    deviceId: item.deviceId || "",
    deviceName: item.deviceName || ""
  });
};

export const config = { path: "/api/onesoft/pair/status" };
