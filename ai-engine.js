
"use strict";

// AR-RIZQ MACRO NEWS SIGNAL ENGINE v1
// Scenario-based analysis, not guaranteed trade signals.

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "CAD", "JPY"];

const PAIRS = {
  USD: [
    { symbol: "EURUSD", side: -1 },
    { symbol: "GBPUSD", side: -1 },
    { symbol: "USDJPY", side: 1 },
    { symbol: "USDCAD", side: 1 },
    { symbol: "XAUUSD", side: -1 }
  ],
  EUR: [
    { symbol: "EURUSD", side: 1 },
    { symbol: "EURGBP", side: 1 },
    { symbol: "EURJPY", side: 1 }
  ],
  GBP: [
    { symbol: "GBPUSD", side: 1 },
    { symbol: "EURGBP", side: -1 },
    { symbol: "GBPJPY", side: 1 }
  ],
  AUD: [
    { symbol: "AUDUSD", side: 1 },
    { symbol: "AUDJPY", side: 1 }
  ],
  CAD: [
    { symbol: "USDCAD", side: -1 },
    { symbol: "CADJPY", side: 1 }
  ],
  JPY: [
    { symbol: "USDJPY", side: -1 },
    { symbol: "EURJPY", side: -1 },
    { symbol: "GBPJPY", side: -1 }
  ]
};

function parseNumber(value) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  if (!text || text === "-" || text === "—") return null;
  if (/[<>]/.test(text)) return null;

  const cleaned = text.replace(/[%,$,\s]/g, "");
  const num = Number(cleaned);

  return Number.isFinite(num) ? num : null;
}

function classifyEvent(title) {
  const name = String(title || "").toLowerCase();

  if (/unemployment rate|jobless rate|claimant count|unemployment claims|jobless claims/.test(name)) {
    return { type: "LABOUR_INVERSE", higherGood: false };
  }

  if (/non-farm|nonfarm|employment change|jobs report|payrolls|wage growth|average hourly earnings/.test(name)) {
    return { type: "LABOUR", higherGood: true };
  }

  if (/cpi|ppi|pce|inflation|consumer price|producer price/.test(name)) {
    return { type: "INFLATION", higherGood: true };
  }

  if (/interest rate|federal funds rate|overnight rate|policy rate|refinancing rate|cash rate|bank rate/.test(name)) {
    return { type: "RATES", higherGood: true };
  }

  if (/gdp|retail sales|pmi|industrial production|durable goods|consumer confidence/.test(name)) {
    return { type: "GROWTH", higherGood: true };
  }

  return { type: "COMPLEX", higherGood: null };
}

function biasForSurprise(event, actual, forecast) {
  const category = classifyEvent(event.event || event.title);

  if (category.higherGood === null) {
    return "NEUTRAL";
  }

  const difference = actual - forecast;
  const tolerance = Math.max(
    0.000001,
    Math.abs(forecast) * 0.0001
  );

  if (Math.abs(difference) <= tolerance) {
    return "NEUTRAL";
  }

  const positive = difference > 0;

  return positive === category.higherGood
    ? "BULLISH"
    : "BEARISH";
}

function pairScenarios(currency, bias) {
  return (PAIRS[currency] || []).map(pair => {
    let direction = "NEUTRAL";

    if (bias === "BULLISH") {
      direction = pair.side === 1 ? "BUY_BIAS" : "SELL_BIAS";
    }

    if (bias === "BEARISH") {
      direction = pair.side === 1 ? "SELL_BIAS" : "BUY_BIAS";
    }

    return {
      pair: pair.symbol,
      direction,
      confirmed: false,
      note: "Macro relationship only. Verify market structure, liquidity and price action."
    };
  });
}

function analyzeNews(event) {
  const currency = event.currency || event.country;
  const name = event.event || event.title || "Economic Event";

  const forecast = parseNumber(event.forecast);
  const previous = parseNumber(event.previous);
  const actual = parseNumber(event.actual);

  const category = classifyEvent(name);
  const hasForecast = forecast !== null;
  const hasActual = actual !== null;

  let bias = "NEUTRAL";
  let phase = "PRE_RELEASE";
  let explanation = "";
  let above = "Currency reaction requires confirmation.";
  let below = "Currency reaction requires confirmation.";

  if (category.higherGood !== null) {
    const higher = category.higherGood;

    above = higher
      ? `${currency} bullish pressure possible if actual is above forecast.`
      : `${currency} bearish pressure possible if actual is above forecast.`;

    below = higher
      ? `${currency} bearish pressure possible if actual is below forecast.`
      : `${currency} bullish pressure possible if actual is below forecast.`;
  }

  if (!hasActual) {
    explanation = hasForecast
      ? `${name}: Forecast ${event.forecast}, Previous ${event.previous || "-"}. Actual result not available. These are conditional scenarios, not a trade signal.`
      : `${name}: Forecast or actual data unavailable. Wait for verified release and market reaction.`;
  } else if (!hasForecast) {
    phase = "POST_RELEASE_INCOMPLETE";
    explanation =
      `${name}: Actual ${event.actual} is available but forecast is missing. Surprise direction cannot be calculated.`;
  } else {
    phase = "POST_RELEASE";
    bias = biasForSurprise(event, actual, forecast);

    const difference = actual - forecast;

    explanation =
      `${name}: Actual ${event.actual}, Forecast ${event.forecast}, Previous ${event.previous || "-"}. ` +
      `Numeric surprise: ${difference > 0 ? "+" : ""}${Number(difference.toFixed(5))}. ` +
      `Preliminary ${currency} macro bias: ${bias}. ` +
      `Inflation, policy expectations, revisions and price action may change the reaction.`;
  }

  return {
    eventId: event.id || null,
    event: name,
    currency,
    phase,
    category: category.type,
    bias,
    signal: bias === "BULLISH"
      ? "BUY_BIAS"
      : bias === "BEARISH"
        ? "SELL_BIAS"
        : "NEUTRAL",
    confirmed: false,
    confidence: "NOT_CALIBRATED",
    explanation,
    scenarios: {
      aboveForecast: above,
      belowForecast: below,
      atForecast: "Near forecast: mixed or neutral reaction possible."
    },
    forecast: event.forecast || "-",
    previous: event.previous || "-",
    actual: event.actual || "-",
    pairs: pairScenarios(currency, bias),
    disclaimer:
      "Rule-based macro scenario, not a trained predictive AI model or automatic trade recommendation."
  };
}

function analyzeCalendar(events) {
  const rows = Array.isArray(events) ? events : [];

  return {
    engine: "AR-RIZQ MACRO SCENARIO ENGINE v1",
    modelType: "RULE_BASED",
    trainedAI: false,
    eventsAnalyzed: rows.length,
    signals: rows.map(analyzeNews)
  };
}

module.exports = {
  analyzeNews,
  analyzeCalendar,
  pairScenarios,
  parseNumber,
  CURRENCIES
};
