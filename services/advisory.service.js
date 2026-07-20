const db = require('../db/connection');
const { getWeather } = require('./weather.service');

const RULES = {
  'rice:dry': 'Water your paddy field immediately. Rice needs 5-7cm standing water during dry spells.',
  'rice:rainy': 'Ensure drainage channels are open. Excess water can damage young rice plants.',
  'rice:hot': 'Increase water level to 7-10cm to protect roots from heat stress.',
  'rice:cold': 'Maintain 10cm water level to insulate roots from cold temperatures.',
  'wheat:dry': 'Irrigate wheat crop. Moisture stress at tillering stage reduces yield.',
  'wheat:rainy': 'Avoid excess irrigation. Drain standing water from wheat fields.',
  'wheat:hot': 'Light irrigation recommended in early morning to reduce heat stress.',
  'wheat:cold': 'No immediate action needed. Wheat tolerates cold well.',
  'maize:dry': 'Irrigate immediately. Maize is sensitive to drought at flowering stage.',
  'maize:rainy': 'Ensure proper drainage. Waterlogging can cause root rot in maize.',
  'maize:hot': 'Apply mulch to conserve soil moisture and reduce root zone temperature.',
  'jute:dry': 'Irrigate jute field. Moisture stress affects fibre quality.',
  'jute:rainy': 'Drain excess water. Jute is sensitive to waterlogging.',
  'potato:dry': 'Light irrigation recommended. Potato needs consistent moisture for tuber development.',
  'potato:rainy': 'Avoid irrigation. Drain excess water to prevent late blight.',
  DEFAULT_DRY: 'Irrigation recommended due to dry conditions. Monitor soil moisture.',
  DEFAULT_RAINY: 'Heavy rainfall expected. Ensure drainage and delay spraying if planned.',
  DEFAULT_HOT: 'High temperature alert. Provide shade/irrigation to sensitive crops.',
  DEFAULT_COLD: 'Low temperature alert. Protect sensitive crops with mulch/cover.',
  DEFAULT_NORMAL: 'Weather is normal. Continue regular crop management practices.',
};

async function getAdvisory(cropType, soilType, upazila) {
  const weather = await getWeather(upazila);
  const condition = weather.condition;

  const key = `${cropType.toLowerCase()}:${condition}`;
  let template = RULES[key];

  if (!template) {
    const fallbackKey = `DEFAULT_${condition.toUpperCase()}`;
    template = RULES[fallbackKey] || RULES.DEFAULT_NORMAL;
  }

  return {
    cropType,
    condition,
    temperature: weather.temp,
    message: template,
    upazila,
  };
}

module.exports = { getAdvisory };
