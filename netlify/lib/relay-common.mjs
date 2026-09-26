import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

export const store = () => getStore("onesoft-mobile-relay");

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, authorization, x-onesoft-company-key",
      "access-control-allow-methods": "GET,POST,OPTIONS"
    }
  });
}

export function envCompanyId() {
  return (process.env.ONESOFT_COMPANY_ID || "").trim();
}

export function envCompanyKey() {
  return (process.env.ONESOFT_COMPANY_KEY || "").trim();
}

export function requireCompany(req, companyId) {
  const wantedId = envCompanyId();
  const wantedKey = envCompanyKey();
  const suppliedKey = (req.headers.get("x-onesoft-company-key") || "").trim();

  if (!wantedId || !wantedKey) {
    return { ok: false, response: json({ error: "server_not_configured" }, 503) };
  }
  if ((companyId || "").trim() !== wantedId || !safeEqual(suppliedKey, wantedKey)) {
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }
  return { ok: true };
}

export function safeEqual(a, b) {
  const aa = Buffer.from(a || "", "utf8");
  const bb = Buffer.from(b || "", "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function origin(req) {
  return new URL(req.url).origin;
}
