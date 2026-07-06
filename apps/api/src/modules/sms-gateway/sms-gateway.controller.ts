import { Router, Request, Response } from "express";
import { SmsGatewayService } from "./sms-gateway.service";

const router = Router();
const sms = new SmsGatewayService();

router.post("/send", async (req: Request, res: Response) => {
  try {
    const result = await sms.send(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/advisory", async (req: Request, res: Response) => {
  try {
    const result = await sms.sendAdvisory(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/verification", async (req: Request, res: Response) => {
  try {
    const result = await sms.sendVerificationResult(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/complaint-update", async (req: Request, res: Response) => {
  try {
    const result = await sms.sendComplaintUpdate(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
