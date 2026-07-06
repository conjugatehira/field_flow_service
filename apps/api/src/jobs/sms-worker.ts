import { PrismaClient } from "@prisma/client";
import { SmsGatewayService } from "../modules/sms-gateway/sms-gateway.service";
import { WeatherService } from "../modules/weather/weather.service";
import { AdvisoryService } from "../modules/advisory/advisory.service";

const prisma = new PrismaClient();
const sms = new SmsGatewayService();
const weather = new WeatherService();
const advisory = new AdvisoryService();

const POLL_INTERVAL_MS = 30_000;

async function processPendingJobs() {
  try {
    const farmers = await prisma.farmer.findMany({ take: 10 });

    for (const farmer of farmers) {
      try {
        const weatherData = await weather.fetchByUpazila(farmer.upazila);
        const advice = await advisory.getAdvice({
          cropType: farmer.cropType,
          soilType: farmer.soilType,
          weatherCondition: weatherData.condition,
          languagePref: farmer.languagePref,
        });

        if (advice) {
          const lang = farmer.languagePref as "bn" | "en";
          await sms.sendAdvisory({
            phone: farmer.phone,
            farmerName: farmer.name,
            advice,
            language: lang,
          });
        }
      } catch (err) {
        console.error(`[sms-worker] Failed for farmer ${farmer.id}:`, err);
      }
    }

    console.log(`[sms-worker] Processed ${farmers.length} farmers`);
  } catch (err) {
    console.error("[sms-worker] Error:", err);
  }
}

console.log(`[sms-worker] Starting (poll every ${POLL_INTERVAL_MS / 1000}s)`);
processPendingJobs();
setInterval(processPendingJobs, POLL_INTERVAL_MS);

process.on("SIGTERM", () => {
  console.log("[sms-worker] Shutting down");
  process.exit(0);
});
