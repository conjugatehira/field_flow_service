import { Router, Request, Response } from "express";
import { ComplaintService } from "./complaint.service";

const router = Router();
const complaintService = new ComplaintService();

router.post("/", async (req: Request, res: Response) => {
  try {
    const complaint = await complaintService.create(req.body);
    res.status(201).json(complaint);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const complaints = await complaintService.list(status);
  res.json(complaints);
});

router.get("/farmer/:farmerId", async (req: Request, res: Response) => {
  const complaints = await complaintService.listByFarmer(req.params.farmerId);
  res.json(complaints);
});

router.get("/supplier/:supplierId", async (req: Request, res: Response) => {
  const complaints = await complaintService.listBySupplier(req.params.supplierId);
  res.json(complaints);
});

router.get("/:id", async (req: Request, res: Response) => {
  const complaint = await complaintService.findById(req.params.id);
  if (!complaint) return res.status(404).json({ error: "Complaint not found" });
  res.json(complaint);
});

router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const complaint = await complaintService.updateStatus(req.params.id, status);
    res.json(complaint);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
