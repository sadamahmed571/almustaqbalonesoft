import { store, json, requireCompany } from "../lib/relay-common.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId") || "";
  const auth = requireCompany(req, companyId);
  if (!auth.ok) return auth.response;

  const s = store();
  const listed = await s.list({ prefix: `queue/${companyId}/` });
  const keys = listed.blobs
    .map(x => x.key)
    .sort()
    .slice(0, 200);

  const items = [];
  for (const key of keys) {
    const x = await s.get(key, { type: "json", consistency: "strong" });
    if (x) {
      items.push({
        cloudId: key,
        receivedAt: x.receivedAt || "",
        payload: x.payload || null
      });
    }
  }

  items.sort((a, b) => String(a.receivedAt).localeCompare(String(b.receivedAt)));
  return json({ items });
};

export const config = { path: "/api/onesoft/notifications/pull" };
