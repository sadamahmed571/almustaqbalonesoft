import { store, json, sha256, safeEqual, normalizeText } from "../lib/relay-common.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const companyId = String(body.companyId || body.CompanyId || "").trim();
  const deviceId = String(body.deviceId || body.DeviceId || "").trim();
  if (!companyId || !deviceId) return json({ error: "invalid_request" }, 400);
  if (companyId !== (process.env.ONESOFT_COMPANY_ID || "").trim())
    return json({ error: "company_not_found" }, 404);

  const auth = req.headers.get("authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "missing_device_token" }, 401);

  const s = store();
  const device = await s.get(`device/${companyId}/${deviceId}`, { type: "json", consistency: "strong" });
  if (!device || device.active !== true || !safeEqual(sha256(token), String(device.tokenHash || "")))
    return json({ error: "unauthorized_device" }, 401);

  const packageName = String(body.PackageName || body.packageName || "");
  const appName = String(body.AppName || body.appName || "");
  const rawText = String(body.Text || body.text || "");
  const eventId = String(body.EventId || body.eventId || "");

  if (!rawText.trim()) return json({ error: "empty_notification" }, 400);

  // منع التكرار في طبقة النقل: المصدر + النص المالي المعياري.
  // OneSoft يطبق منعاً أقوى بعد التحليل: المصدر + المرجع + المبلغ + الاتجاه.
  const fingerprint = sha256(
    packageName + "|" + appName + "|" + normalizeText(rawText)
  );

  const cloudId = `queue/${companyId}/${fingerprint}`;
  const payload = {
    DeviceId: deviceId,
    PackageName: packageName,
    AppName: appName,
    Title: String(body.Title || body.title || ""),
    Text: rawText,
    EventId: eventId,
    PostedAtUtc: body.PostedAtUtc || body.postedAtUtc || null
  };

  const result = await s.setJSON(cloudId, {
    cloudId,
    companyId,
    receivedAt: new Date().toISOString(),
    payload
  }, { onlyIfNew: true });

  return json({
    accepted: true,
    duplicate: !result.modified,
    cloudId
  });
};

export const config = { path: "/api/onesoft/notifications/push" };
