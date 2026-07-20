const crypto = require('crypto');
const QRCodeLib = require('qrcode');

const QR_SECRET = process.env.JWT_SECRET || 'fieldflow-dev-secret';

function generateQrCode(batchId, dealerId, productName) {
  const timestamp = Date.now();
  const raw = `${batchId}:${dealerId}:${productName}:${timestamp}`;
  const signature = crypto.createHmac('sha256', QR_SECRET).update(raw).digest('hex');
  const code = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
  return { code, signature, raw };
}

function buildSignedPayload(batch) {
  const payload = {
    id: batch.id,
    product: batch.product_name,
    type: batch.product_type,
    mfg: batch.mfg_date,
    exp: batch.expiry_date,
    code: batch.qr_code,
    ts: Date.now(),
  };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', QR_SECRET).update(raw).digest('hex').slice(0, 16);
  payload.sig = sig;
  return payload;
}

function verifySignedPayload(payload) {
  const sig = payload.sig;
  delete payload.sig;
  const raw = JSON.stringify(payload);
  const computed = crypto.createHmac('sha256', QR_SECRET).update(raw).digest('hex').slice(0, 16);
  return computed === sig;
}

function verifySignature(code, storedSignature, batchId, dealerId, productName) {
  const raw = `${batchId}:${dealerId}:${productName}`;
  const expected = crypto.createHmac('sha256', QR_SECRET).update(raw).digest('hex');
  return storedSignature === expected && code === crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
}

async function generateQrImage(text) {
  return QRCodeLib.toDataURL(text);
}

async function generateQrWithPayload(batch) {
  const payload = buildSignedPayload(batch);
  const text = JSON.stringify(payload);
  const image = await QRCodeLib.toDataURL(text);
  return { image, payload, text };
}

module.exports = { generateQrCode, verifySignature, generateQrImage, generateQrWithPayload, buildSignedPayload, verifySignedPayload };
