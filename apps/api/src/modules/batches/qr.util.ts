import crypto from "crypto";

const ALGORITHM = "HS256";
const SEPARATOR = ".";

export interface QrPayload {
  batchId: string;
  batchNumber: string;
  productType: string;
  productName: string;
  mfgDate: string;
  expiryDate: string;
  dealerId: string;
  nonce: string;
  iat: number;
}

export interface QrCodeData {
  payload: QrPayload;
  signature: string;
}

function getSecret(): string {
  return process.env.QR_SIGNING_SECRET ?? "dev-secret-change-in-production";
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function signPayload(
  partial: Omit<QrPayload, "nonce" | "iat">
): QrCodeData {
  const payload: QrPayload = {
    ...partial,
    nonce: generateNonce(),
    iat: Math.floor(Date.now() / 1000),
  };

  const data = serialize(payload);
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(data)
    .digest("base64url");

  return { payload, signature };
}

export function verifySignature(qrData: QrCodeData): {
  valid: boolean;
  reason?: string;
} {
  try {
    const data = serialize(qrData.payload);
    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(data)
      .digest("base64url");

    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(qrData.signature);
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return { valid: false, reason: "Signature mismatch — QR may be counterfeit" };
    }

    const now = Math.floor(Date.now() / 1000);
    if (qrData.payload.iat && now - qrData.payload.iat > 365 * 24 * 3600) {
      return { valid: false, reason: "QR code expired (older than 1 year)" };
    }

    const expiry = new Date(qrData.payload.expiryDate);
    if (expiry < new Date()) {
      return { valid: false, reason: "Batch has expired" };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: "Malformed QR data" };
  }
}

function serialize(payload: QrPayload): string {
  return [
    payload.batchId,
    payload.batchNumber,
    payload.productType,
    payload.productName,
    payload.mfgDate,
    payload.expiryDate,
    payload.dealerId,
    payload.nonce,
    payload.iat,
  ].join(SEPARATOR);
}

export function encodeQrData(qrData: QrCodeData): string {
  return Buffer.from(JSON.stringify(qrData)).toString("base64url");
}

export function decodeQrData(encoded: string): QrCodeData {
  const json = Buffer.from(encoded, "base64url").toString("utf-8");
  return JSON.parse(json);
}
