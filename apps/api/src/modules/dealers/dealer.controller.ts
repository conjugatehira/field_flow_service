import { Router, Request, Response } from "express";
import { DealerService } from "./dealer.service";

const router = Router();
const dealerService = new DealerService();

router.post("/", async (req: Request, res: Response) => {
  try {
    const dealer = await dealerService.create(req.body);
    res.status(201).json(dealer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const upazila = req.query.upazila as string | undefined;
  const dealers = await dealerService.list(upazila);
  res.json(dealers);
});

router.get("/:id", async (req: Request, res: Response) => {
  const dealer = await dealerService.findById(req.params.id);
  if (!dealer) return res.status(404).json({ error: "Dealer not found" });
  res.json(dealer);
});

router.patch("/:id/verify", async (req: Request, res: Response) => {
  const dealer = await dealerService.verify(req.params.id);
  res.json(dealer);
});

export default router;
