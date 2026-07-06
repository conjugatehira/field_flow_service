const WEATHER_API_BASE = process.env.WEATHER_API_BASE_URL ?? "https://api.openweathermap.org/data/2.5";
const WEATHER_API_KEY = process.env.WEATHER_API_KEY ?? "";

export interface WeatherData {
  condition: "Normal" | "Dry" | "Rainy" | "Flood" | "Heatwave";
  tempC: number;
  humidity: number;
  rainfallMm: number;
  upazila: string;
  fetchedAt: string;
}

// Map OpenWeatherMap condition codes to our domain conditions
function mapCondition(code: number): WeatherData["condition"] {
  if (code >= 200 && code < 300) return "Rainy";
  if (code >= 300 && code < 400) return "Rainy";
  if (code >= 500 && code < 600) return "Rainy";
  if (code >= 600 && code < 700) return "Normal";
  if (code >= 700 && code < 800) return "Normal";
  if (code === 800) return "Dry";
  if (code === 801) return "Normal";
  if (code >= 802 && code <= 804) return "Rainy";
  return "Normal";
}

export class WeatherService {
  async fetchByUpazila(upazila: string): Promise<WeatherData> {
    if (!WEATHER_API_KEY || WEATHER_API_KEY === "mock") {
      return this.mockData(upazila);
    }

    const url = `${WEATHER_API_BASE}/weather?q=${encodeURIComponent(upazila)},BD&appid=${WEATHER_API_KEY}&units=metric`;
    const res = await fetch(url);

    if (!res.ok) {
      return this.mockData(upazila);
    }

    const data = await res.json();
    return {
      condition: mapCondition(data.weather[0]?.id ?? 800),
      tempC: Math.round(data.main.temp),
      humidity: data.main.humidity,
      rainfallMm: data.rain?.["1h"] ?? 0,
      upazila,
      fetchedAt: new Date().toISOString(),
    };
  }

  private mockData(upazila: string): WeatherData {
    const conditions: WeatherData["condition"][] = ["Normal", "Dry", "Rainy", "Heatwave"];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    return {
      condition,
      tempC: 25 + Math.floor(Math.random() * 15),
      humidity: 50 + Math.floor(Math.random() * 40),
      rainfallMm: condition === "Rainy" ? 5 + Math.random() * 20 : 0,
      upazila,
      fetchedAt: new Date().toISOString(),
    };
  }
}
