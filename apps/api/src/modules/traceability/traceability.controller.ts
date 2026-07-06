import { Router, Request, Response } from "express";
import { TraceabilityService } from "./traceability.service";

const router = Router();
const traceabilityService = new TraceabilityService();

router.get("/batch/:batchId", async (req: Request, res: Response) => {
  const chain = await traceabilityService.getChainForBatch(req.params.batchId);
  if (!chain) return res.status(404).json({ error: "Batch not found" });
  res.json(chain);
});

router.post("/events", async (req: Request, res: Response) => {
  try {
    const event = await traceabilityService.recordEvent(req.body);
    res.status(201).json(event);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/events", async (_req: Request, res: Response) => {
  const events = await traceabilityService.listRecentEvents();
  res.json(events);
});

export default router;
