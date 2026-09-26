import { store, json, requireCompany, randomToken } from "../lib/relay-common.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const companyId = String(body.companyId || "");
  const auth = requireCompany(req, companyId);
  if (!auth.ok) return auth.response;

  const code = randomToken(18);
  const ttlMinutes = Math.max(2, Math.min(30, Number(process.env.ONESOFT_PAIR_TTL_MINUTES || "10")));
  const expiresAt = new Date(Date.now() + ttlMinutes * 60000).toISOString();

  await store().setJSON(`pair/${companyId}/${code}`, {
    companyId,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt
  }, { onlyIfNew: true });

  return json({ pairingCode: code, expiresAt });
};

export const config = { path: "/api/onesoft/pair/start" };
