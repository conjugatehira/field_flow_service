import { PrismaClient } from "@prisma/client";
import { WeatherService } from "../modules/weather/weather.service";

const prisma = new PrismaClient();
const weather = new WeatherService();

const POLL_INTERVAL_MS = 3_600_000; // 1 hour

async function refreshWeatherData() {
  try {
    const upazilas = await prisma.farmer.findMany({
      select: { upazila: true },
      distinct: ["upazila"],
    });

    for (const { upazila } of upazilas) {
      try {
        const data = await weather.fetchByUpazila(upazila);
        console.log(`[weather-refresh] ${upazila}: ${data.condition}, ${data.tempC}°C`);
      } catch (err) {
        console.error(`[weather-refresh] Failed for ${upazila}:`, err);
      }
    }

    console.log(`[weather-refresh] Updated ${upazilas.length} upazilas`);
  } catch (err) {
    console.error("[weather-refresh] Error:", err);
  }
}

console.log("[weather-refresh] Starting (poll every 1h)");
refreshWeatherData();
setInterval(refreshWeatherData, POLL_INTERVAL_MS);

process.on("SIGTERM", () => {
  console.log("[weather-refresh] Shutting down");
  process.exit(0);
});
