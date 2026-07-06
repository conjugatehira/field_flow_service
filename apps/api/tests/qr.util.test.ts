import { describe, it, expect } from "vitest";
import { signPayload, verifySignature, encodeQrData, decodeQrData } from "../src/modules/batches/qr.util";

describe("QR Util", () => {
  const batchInfo = {
    batchId: "01JAN01",
    batchNumber: "IN-2026-4421",
    productType: "Fertilizer",
    productName: "UREA 46% N",
    mfgDate: "2026-01-15",
    expiryDate: "2028-01-15",
    dealerId: "dealer-001",
  };

  it("signs and verifies a valid payload", () => {
    const qrData = signPayload(batchInfo);
    expect(qrData.signature).toBeTruthy();
    expect(qrData.payload.nonce).toBeTruthy();
    expect(qrData.payload.iat).toBeTruthy();

    const result = verifySignature(qrData);
    expect(result.valid).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const qrData = signPayload(batchInfo);
    qrData.signature = "tampered-signature";
    const result = verifySignature(qrData);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("Signature mismatch");
  });

  it("rejects an expired batch", () => {
    const qrData = signPayload({
      ...batchInfo,
      expiryDate: "2020-01-01",
    });
    const result = verifySignature(qrData);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("expired");
  });

  it("encodes and decodes round-trip", () => {
    const qrData = signPayload(batchInfo);
    const encoded = encodeQrData(qrData);
    expect(typeof encoded).toBe("string");

    const decoded = decodeQrData(encoded);
    expect(decoded.payload.batchId).toBe(batchInfo.batchId);
    expect(decoded.signature).toBe(qrData.signature);
  });

  it("generates unique nonces for each signature", () => {
    const qr1 = signPayload(batchInfo);
    const qr2 = signPayload(batchInfo);
    expect(qr1.payload.nonce).not.toBe(qr2.payload.nonce);
  });
});
