import { store, json, requireCompany } from "../lib/relay-common.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const companyId = String(body.companyId || "");
  const auth = requireCompany(req, companyId);
  if (!auth.ok) return auth.response;

  const ids = Array.isArray(body.ids) ? body.ids.slice(0, 200) : [];
  const s = store();
  let archived = 0;

  for (const id of ids) {
    const key = String(id || "");
    if (!key.startsWith(`queue/${companyId}/`)) continue;

    const item = await s.get(key, { type: "json", consistency: "strong" });
    if (!item) continue;

    const archiveKey = key.replace(`queue/${companyId}/`, `archive/${companyId}/`);
    await s.setJSON(archiveKey, {
      ...item,
      archivedAt: new Date().toISOString()
    });

    await s.delete(key);
    archived++;
  }

  return json({ ok: true, archived });
};

export const config = { path: "/api/onesoft/notifications/ack" };
