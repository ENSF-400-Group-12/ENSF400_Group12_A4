/**
 * Weather options for outfit generation (must stay in sync with backend allowlist).
 * Open-Meteo: https://open-meteo.com/en/docs (WMO weather codes).
 */

export const WEATHER_OPTIONS = [
  "Clear",
  "Cloudy",
  "Rain",
  "Snow",
  "Hot",
  "Cold",
];

export const DEFAULT_WEATHER = "Cloudy";

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

/**
 * Map Open-Meteo WMO code + temperature to a dropdown value.
 * @param {number} code - WMO weather code
 * @param {number|null} tempC
 */
export function mapOpenMeteoToWeatherOption(code, tempC) {
  const c = Number.isFinite(code) ? code : 0;
  const clearish = [0, 1, 2, 3].includes(c);

  if (tempC != null && tempC >= 30) return "Hot";
  if (tempC != null && tempC <= -10) return "Cold";
  if (tempC != null && tempC <= 5 && tempC > -10 && clearish) return "Cold";

  switch (c) {
    case 0:
      return "Clear";
    case 1:
    case 2:
    case 3:
      return "Cloudy";
    case 45:
    case 48:
      return "Cloudy";
    case 51:
    case 53:
    case 55:
    case 61:
    case 63:
    case 65:
    case 80:
    case 81:
    case 82:
      return "Rain";
    case 56:
    case 57:
    case 66:
    case 67:
      return "Snow";
    case 71:
    case 73:
    case 75:
    case 77:
    case 85:
    case 86:
      return "Snow";
    case 95:
    case 96:
    case 99:
      return "Rain";
    default:
      return "Cloudy";
  }
}

/**
 * @returns {Promise<{ option: string, tempC: number|null, code: number }>}
 */
export async function fetchCurrentWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,weather_code",
  });
  const res = await fetch(`${OPEN_METEO}?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Weather request failed.");
  }
  const data = await res.json();
  const cur = data.current;
  if (!cur) {
    throw new Error("No current weather in response.");
  }
  const tempC = typeof cur.temperature_2m === "number" ? cur.temperature_2m : null;
  const code = typeof cur.weather_code === "number" ? cur.weather_code : 0;
  const option = mapOpenMeteoToWeatherOption(code, tempC);
  return { option, tempC, code };
}

export function formatWeatherSummary(tempC, label) {
  if (tempC == null || Number.isNaN(tempC)) {
    return label;
  }
  const t = Math.round(tempC * 10) / 10;
  return `${t}°C · ${label}`;
}
