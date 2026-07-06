import { Router, Request, Response } from "express";
import { WeatherService } from "./weather.service";

const router = Router();
const weatherService = new WeatherService();

router.get("/:upazila", async (req: Request, res: Response) => {
  try {
    const data = await weatherService.fetchByUpazila(req.params.upazila);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
