import QRCode from "qrcode";
import { json, origin } from "../lib/relay-common.mjs";

export default async (req) => {
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId") || "";
  const code = url.searchParams.get("code") || "";

  if (!companyId || !code) return json({ error: "invalid_request" }, 400);
  if (companyId !== (process.env.ONESOFT_COMPANY_ID || "").trim())
    return json({ error: "company_not_found" }, 404);

  const payload = JSON.stringify({
    v: 1,
    baseUrl: origin(req),
    companyId,
    pairingCode: code
  });

  const png = await QRCode.toBuffer(payload, {
    type: "png",
    width: 360,
    margin: 1,
    errorCorrectionLevel: "M"
  });

  return new Response(png, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "no-store"
    }
  });
};

export const config = { path: "/api/onesoft/pair/qr" };
