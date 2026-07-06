import { Router, Request, Response } from "express";
import { AdvisoryService } from "./advisory.service";
import { WeatherService } from "../weather/weather.service";
import { FarmerService } from "../farmers/farmer.service";
import { WeatherCondition } from "@fieldflow/shared-types";

const router = Router();
const advisoryService = new AdvisoryService();
const weatherService = new WeatherService();
const farmerService = new FarmerService();

router.get("/advise/:farmerId", async (req: Request, res: Response) => {
  try {
    const farmer = await farmerService.findById(req.params.farmerId);
    if (!farmer) return res.status(404).json({ error: "Farmer not found" });

    const weather = await weatherService.fetchByUpazila(farmer.upazila);
    const advice = await advisoryService.getAdvice({
      cropType: farmer.cropType,
      soilType: farmer.soilType,
      weatherCondition: weather.condition,
      languagePref: farmer.languagePref,
    });

    res.json({ farmer: farmer.name, weather, advice });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/rules", async (req: Request, res: Response) => {
  try {
    const rule = await advisoryService.createRule(req.body);
    res.status(201).json(rule);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/rules", async (_req: Request, res: Response) => {
  const rules = await advisoryService.listRules();
  res.json(rules);
});

router.delete("/rules/:id", async (req: Request, res: Response) => {
  await advisoryService.deleteRule(req.params.id);
  res.status(204).end();
});

export default router;
