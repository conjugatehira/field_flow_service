import { Router, Request, Response } from "express";
import { FarmerService } from "./farmer.service";

const router = Router();
const farmerService = new FarmerService();

router.post("/", async (req: Request, res: Response) => {
  try {
    const farmer = await farmerService.create(req.body);
    res.status(201).json(farmer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const upazila = req.query.upazila as string | undefined;
  const farmers = await farmerService.list(upazila);
  res.json(farmers);
});

router.get("/:id", async (req: Request, res: Response) => {
  const farmer = await farmerService.findById(req.params.id);
  if (!farmer) return res.status(404).json({ error: "Farmer not found" });
  res.json(farmer);
});

export default router;
