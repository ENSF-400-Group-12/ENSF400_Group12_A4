// Form for generating outfit recommendations: occasion, vibe, and weather; wired to API

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authFetch } from "../config/api";
import {
  WEATHER_OPTIONS,
  DEFAULT_WEATHER,
  fetchCurrentWeather,
  formatWeatherSummary,
} from "../lib/weather";

const OCCASIONS = [
  "Casual",
  "Work",
  "School",
  "Date Night",
  "Formal",
  "Weekend",
  "Outdoor",
];

const VIBES = [
  "Casual",
  "Formal",
  "Minimalist",
  "Sporty",
  "Classy",
  "Streetwear",
  "Vintage",
  "Emo",
];

function GenerateOutfit() {
  const navigate = useNavigate();
  const [occasion, setOccasion] = useState("");
  const [vibe, setVibe] = useState(null);
  const [weather, setWeather] = useState(DEFAULT_WEATHER);
  const [weatherStatus, setWeatherStatus] = useState("idle");
  const [weatherSummary, setWeatherSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorHint, setErrorHint] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeatherStatus("unsupported");
      setWeatherSummary("Location is not available in this browser. Choose a weather preset below.");
      return;
    }

    setWeatherStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { option, tempC } = await fetchCurrentWeather(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setWeather(option);
          setWeatherSummary(formatWeatherSummary(tempC, option));
          setWeatherStatus("ok");
        } catch {
          setWeatherStatus("error");
          setWeatherSummary("Could not load live weather. Choose a condition below.");
        }
      },
      () => {
        setWeatherStatus("denied");
        setWeatherSummary("Location not shared. Choose the weather for your outfit below.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!occasion || !vibe) {
      setError("Please choose an occasion and an aesthetic.");
      setErrorHint(null);
      return;
    }
    if (!weather) {
      setError("Please choose a weather condition.");
      setErrorHint(null);
      return;
    }
    setError(null);
    setErrorHint(null);
    setLoading(true);
    try {
      const res = await authFetch("/api/outfits/generate", {
        method: "POST",
        body: JSON.stringify({ occasion, vibe, weather }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data.error || "Generation failed. Try again.";
        if (res.status === 401) {
          setError("Please log in to generate outfits.");
          setErrorHint(null);
        } else {
          setError(msg);
          setErrorHint(data.suggestion || null);
        }
        setLoading(false);
        return;
      }
      navigate("/results", { state: { outfit: data } });
    } catch (err) {
      setErrorHint(null);
      const msg = err.name === "TypeError" && (err.message === "Failed to fetch" || err.message?.includes("fetch"))
        ? "Could not reach the server. Start the backend and try again."
        : "Could not reach the server. Check that the backend is running.";
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="generate-page">
      <div className="generate-card">
        <h1 className="generate-title">Generate Outfit</h1>
        <p className="generate-subtext">
          Two quick choices: <strong>where you’re going</strong>, then <strong>how you want to look</strong>. We’ll build from your wardrobe: usually a clean three-piece look; an extra layer only when it clearly helps.
        </p>

        <form onSubmit={handleSubmit} noValidate className="generate-form-inner">
          <div className="generate-field">
            <label htmlFor="generate-occasion">Occasion</label>
            <p className="generate-field-help" id="generate-occasion-help">
              Where you’re headed (context for the outfit).
            </p>
            <select
              id="generate-occasion"
              className="generate-input"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              aria-label="Occasion"
              aria-describedby="generate-occasion-help"
            >
              <option value="">Choose an occasion…</option>
              {OCCASIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="generate-field generate-field--vibe">
            <span className="generate-label" id="generate-vibe-label">Aesthetic</span>
            <p className="generate-field-help" id="generate-vibe-help">
              The mood and dress code you want: not the same as occasion (e.g. Work + Minimalist, or Weekend + Streetwear).
            </p>
            <div
              className="generate-chips"
              role="group"
              aria-labelledby="generate-vibe-label"
              aria-describedby="generate-vibe-help"
            >
              {VIBES.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`generate-chip ${vibe === opt ? "generate-chip--selected" : ""}`}
                  onClick={() => setVibe(vibe === opt ? null : opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="generate-field generate-field--weather">
            <label htmlFor="generate-weather">Weather</label>
            <p className="generate-field-help" id="generate-weather-help">
              Outfits use the condition you pick; we prefill from your location when possible. Change it if you’re planning ahead.
            </p>
            {weatherStatus === "loading" && (
              <p className="generate-weather-live generate-weather-live--muted" aria-live="polite">
                Detecting location and loading weather…
              </p>
            )}
            {(weatherStatus === "ok" || weatherStatus === "error" || weatherStatus === "denied" || weatherStatus === "unsupported") && weatherSummary && (
              <p className="generate-weather-live" id="generate-weather-live" aria-live="polite">
                {weatherSummary}
              </p>
            )}
            <select
              id="generate-weather"
              className="generate-input"
              value={weather}
              onChange={(e) => setWeather(e.target.value)}
              aria-label="Weather conditions"
              aria-describedby="generate-weather-help generate-weather-live"
            >
              {WEATHER_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="generate-feedback" role="alert">
              <p className="generate-error">{error}</p>
              {errorHint && (
                <p className="generate-suggestion">{errorHint}</p>
              )}
              {(/wardrobe|not enough|doesn'?t have enough|suitable items|pieces that fit/i.test(error)) && (
                <p className="generate-cta">
                  <Link to="/add-item">Add items to your wardrobe</Link> or try again later.
                </p>
              )}
              {error.includes("log in") && (
                <p className="generate-cta">
                  <Link to="/">Go to login</Link>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            className="button-primary generate-button"
            disabled={loading}
          >
            {loading ? "Generating…" : "Generate Outfit"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default GenerateOutfit;
