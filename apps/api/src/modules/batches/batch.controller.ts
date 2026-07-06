import { Router, Request, Response } from "express";
import { BatchService } from "./batch.service";
import { verifySignature, encodeQrData, decodeQrData } from "./qr.util";
import { CreateBatchInput } from "@fieldflow/shared-types";

const router = Router();
const batchService = new BatchService();

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateBatchInput.parse(req.body);
    const batch = await batchService.create(parsed);
    const qrEncoded = encodeQrData({
      payload: batch.qrPayload,
      signature: batch.qrSignature,
    });
    res.status(201).json({ batch, qrEncoded });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? "Invalid input" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const batch = await batchService.findById(req.params.id);
  if (!batch) return res.status(404).json({ error: "Batch not found" });
  res.json(batch);
});

router.get("/dealer/:dealerId", async (req: Request, res: Response) => {
  const batches = await batchService.listByDealer(req.params.dealerId);
  res.json(batches);
});

router.get("/supplier/:supplierId", async (req: Request, res: Response) => {
  const batches = await batchService.listBySupplier(req.params.supplierId);
  res.json(batches);
});

// ── QR Verification endpoint ──
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { qrEncoded } = req.body;
    if (!qrEncoded) return res.status(400).json({ error: "qrEncoded is required" });

    const qrData = decodeQrData(qrEncoded);
    const result = verifySignature(qrData);

    if (!result.valid) {
      return res.status(200).json({
        verified: false,
        reason: result.reason,
        batch: null,
      });
    }

    const batch = await batchService.findById(qrData.payload.batchId);

    if (!batch) {
      return res.status(200).json({
        verified: false,
        reason: "Batch not found in system",
        batch: null,
      });
    }

    return res.status(200).json({
      verified: true,
      batch: {
        id: batch.id,
        batchNumber: batch.batchNumber,
        productName: batch.productName,
        productType: batch.productType,
        mfgDate: batch.mfgDate,
        expiryDate: batch.expiryDate,
      },
    });
  } catch (err: any) {
    return res.status(400).json({ error: "Invalid QR data" });
  }
});

export default router;
