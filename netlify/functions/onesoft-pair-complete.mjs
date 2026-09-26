import crypto from "node:crypto";
import { store, json, randomToken, sha256, origin } from "../lib/relay-common.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const companyId = String(body.companyId || "").trim();
  const code = String(body.pairingCode || "").trim();
  const deviceName = String(body.deviceName || "Android").slice(0, 160);

  if (!companyId || !code) return json({ error: "invalid_request" }, 400);
  if (companyId !== (process.env.ONESOFT_COMPANY_ID || "").trim())
    return json({ error: "company_not_found" }, 404);

  const s = store();
  const key = `pair/${companyId}/${code}`;
  const pair = await s.get(key, { type: "json", consistency: "strong" });
  if (!pair) return json({ error: "pair_not_found" }, 404);
  if (pair.status === "paired") return json({ error: "pair_already_used" }, 409);
  if (Date.parse(pair.expiresAt || "") < Date.now()) return json({ error: "pair_expired" }, 410);

  const deviceId = `MOB-${crypto.randomUUID()}`;
  const deviceToken = randomToken(32);
  const tokenHash = sha256(deviceToken);

  await s.setJSON(`device/${companyId}/${deviceId}`, {
    companyId,
    deviceId,
    deviceName,
    tokenHash,
    active: true,
    createdAt: new Date().toISOString()
  }, { onlyIfNew: true });

  await s.setJSON(key, {
    ...pair,
    status: "paired",
    pairedAt: new Date().toISOString(),
    deviceId,
    deviceName
  });

  return json({
    deviceId,
    deviceToken,
    companyId,
    pushUrl: origin(req) + "/api/onesoft/notifications/push"
  });
};

export const config = { path: "/api/onesoft/pair/complete" };
