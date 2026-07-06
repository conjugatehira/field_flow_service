import express from "express";
import batchRouter from "./modules/batches/batch.controller";
import dealerRouter from "./modules/dealers/dealer.controller";
import farmerRouter from "./modules/farmers/farmer.controller";
import advisoryRouter from "./modules/advisory/advisory.controller";
import weatherRouter from "./modules/weather/weather.controller";
import complaintRouter from "./modules/complaints/complaint.controller";
import traceabilityRouter from "./modules/traceability/traceability.controller";
import smsRouter from "./modules/sms-gateway/sms-gateway.controller";
import { syncHandler } from "./middleware/offline-sync.middleware";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/sync", syncHandler);

app.use("/api/batches", batchRouter);
app.use("/api/dealers", dealerRouter);
app.use("/api/farmers", farmerRouter);
app.use("/api/advisory", advisoryRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/traceability", traceabilityRouter);
app.use("/api/sms", smsRouter);

app.listen(PORT, () => {
  console.log(`[fieldflow-api] listening on :${PORT}`);
});

export default app;
