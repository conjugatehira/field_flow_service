const https = require('https');

async function getWeather(upazila) {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) {
    return { condition: 'normal', temp: 25, mock: true };
  }

  return new Promise((resolve, reject) => {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(upazila)}&appid=${apiKey}&units=metric`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const main = json.weather?.[0]?.main?.toLowerCase() || 'clear';
          const condition = mapWeatherCondition(main);
          resolve({ condition, temp: json.main?.temp || 25 });
        } catch {
          resolve({ condition: 'normal', temp: 25 });
        }
      });
    }).on('error', () => resolve({ condition: 'normal', temp: 25 }));
  });
}

function mapWeatherCondition(weather) {
  if (['rain', 'drizzle', 'thunderstorm'].includes(weather)) return 'rainy';
  if (['clear'].includes(weather)) return 'dry';
  if (['clouds'].includes(weather)) return 'normal';
  return 'normal';
}

module.exports = { getWeather };
