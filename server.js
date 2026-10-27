
"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const arRizqAI = require("./ai-engine");

const app = express();
const PORT = process.env.PORT || 3000;
const ZONE = "Asia/Kolkata";

const FF_FILE = path.join(
  __dirname,
  "data",
  "forex-factory-week.json"
);

const FINANCE_API =
  "https://www.financecalendar.com/wp-json/fc/v1/calendar";

const CURRENCIES = [
  "USD", "EUR", "GBP", "AUD", "CAD", "JPY"
];

const COUNTRY_MAP = {
  US: "USD",
  EU: "EUR",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  JP: "JPY"
};

const cache = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =====================================================
// TIME HELPERS
// =====================================================

function dateIST(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);

  const get = key =>
    parts.find(p => p.type === key)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function fullIST(d = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: ZONE,
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(d) + " IST";
}

function timeIST(d) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(d) + " IST";
}

function addDays(s, n) {
  const d = new Date(s + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function getBounds(range) {
  const today = dateIST();
  const d = new Date(today + "T00:00:00Z");

  const day = d.getUTCDay();

  const monday = addDays(
    today,
    day === 0 ? -6 : 1 - day
  );

  if (range === "today") {
    return { from: today, to: today };
  }

  if (range === "this_week") {
    return {
      from: monday,
      to: addDays(monday, 6)
    };
  }

  if (range === "next_week") {
    return {
      from: addDays(monday, 7),
      to: addDays(monday, 13)
    };
  }

  const [y, m] = today.split("-").map(Number);

  if (range === "this_month") {
    return {
      from: `${y}-${String(m).padStart(2, "0")}-01`,
      to: new Date(Date.UTC(y, m, 0))
        .toISOString()
        .slice(0, 10)
    };
  }

  if (range === "next_month") {
    return {
      from: new Date(Date.UTC(y, m, 1))
        .toISOString()
        .slice(0, 10),
      to: new Date(Date.UTC(y, m + 1, 0))
        .toISOString()
        .slice(0, 10)
    };
  }

  return {
    from: today,
    to: addDays(today, 90)
  };
}

function clean(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return "-";
  }

  return String(value).trim();
}

function hasValue(value) {
  const v = clean(value);
  return v !== "-" && v !== "—" && v !== "N/A";
}

function eventStatus(iso) {
  if (!iso) return "TIME_UNVERIFIED";

  const diff = Date.parse(iso) - Date.now();

  if (diff > 0) return "UPCOMING";

  if (diff >= -3600000) {
    return "RECENTLY_RELEASED";
  }

  return "PAST";
}

// =====================================================
// NORMALIZE NEWS DATA
// =====================================================

function normalize(row, index, source) {
  const isFF = source === "FOREX_FACTORY_LOCAL";

  const rawCountry = String(
    row.country || row.currency || ""
  ).toUpperCase();

  const currency = CURRENCIES.includes(rawCountry)
    ? rawCountry
    : COUNTRY_MAP[rawCountry];

  if (!CURRENCIES.includes(currency)) {
    return null;
  }

  if (
    String(row.impact || "").toLowerCase() !== "high"
  ) {
    return null;
  }

  const rawDate = isFF
    ? row.date
    : (
      row.release_at_utc ||
      row.time_utc ||
      row.date
    );

  const parsed = rawDate ? new Date(rawDate) : null;

  const valid = parsed &&
    Number.isFinite(parsed.getTime());

  const iso = valid ? parsed.toISOString() : null;

  const eventDate = valid
    ? dateIST(parsed)
    : null;

  if (!eventDate) return null;

  const dayFormatted = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "2-digit"
    }
  ).format(
    new Date(eventDate + "T12:00:00Z")
  );

  const eventName = isFF
    ? (row.title || row.event || row.name)
    : (
      row.name ||
      row.series_name ||
      row.title ||
      row.event
    );

  const id = isFF
    ? `ff_${index}_${Date.parse(row.date)}`
    : String(row.id || `fc_${index}`);

  return {
    id,
    date: eventDate,
    dayFormatted,
    timeFormatted: valid
      ? timeIST(parsed)
      : "Time TBC",
    isoTime: iso,
    isoTarget: iso,
    currency,
    event: clean(eventName),
    impact: "high",

    forecast: clean(
      isFF
        ? row.forecast
        : (row.consensus ?? row.forecast)
    ),

    previous: clean(
      isFF
        ? row.previous
        : (row.prior ?? row.previous)
    ),

    actual: clean(
      isFF ? row.actual : row.actual
    ),

    status: eventStatus(iso),

    source: isFF
      ? "Forex Factory weekly local import"
      : "Finance Calendar",

    dataMode: isFF
      ? "LOCAL_SNAPSHOT"
      : "PROVIDER_CALENDAR",

    sourceUrl: isFF
      ? null
      : (row.source_url || null),

    dataStale: isFF
      ? null
      : (row.data_stale ?? null)
  };
}

// =====================================================
// FOREX FACTORY LOCAL FILE
// =====================================================

function readForexFactory() {
  if (!fs.existsSync(FF_FILE)) {
    throw new Error(
      "Missing data/forex-factory-week.json"
    );
  }

  const data = JSON.parse(
    fs.readFileSync(FF_FILE, "utf8")
  );

  if (!Array.isArray(data)) {
    throw new Error(
      "Forex Factory JSON must be an array"
    );
  }

  return {
    rows: data,
    fetchedAt: fs.statSync(FF_FILE)
      .mtime
      .toISOString()
  };
}

// =====================================================
// OPTIONAL FINANCE CALENDAR PROVIDER
// =====================================================

async function readFinanceCalendar(from, to) {
  const key = `${from}_${to}`;
  const old = cache.get(key);

  if (old && Date.now() - old.time < 300000) {
    return old.data;
  }

  const params = new URLSearchParams({
    from,
    to,
    country: "US,EU,DE,GB,AU,CA,JP",
    impact: "high",
    tz: ZONE,
    limit: "500"
  });

  const headers = {
    Accept: "application/json"
  };

  if (process.env.FC_API_KEY) {
    headers["X-API-Key"] =
      process.env.FC_API_KEY;
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const rows = [];
    let total = null;

    for (let page = 0; page < 10; page++) {
      params.set("offset", String(rows.length));

      const response = await fetch(
        `${FINANCE_API}?${params}`,
        {
          headers,
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new Error(
          `Finance Calendar HTTP ${response.status}`
        );
      }

      const json = await response.json();

      if (!Array.isArray(json.events)) {
        throw new Error(
          "Invalid Finance Calendar response"
        );
      }

      rows.push(...json.events);

      total = Number(
        json.total ?? rows.length
      );

      if (
        json.events.length === 0 ||
        rows.length >= total
      ) {
        break;
      }

      if (page === 9) {
        throw new Error(
          "Finance Calendar pagination incomplete"
        );
      }
    }

    const result = {
      rows,
      fetchedAt: new Date().toISOString()
    };

    cache.set(key, {
      time: Date.now(),
      data: result
    });

    return result;

  } finally {
    clearTimeout(timer);
  }
}

// =====================================================
// AI ENGINE ADAPTER
// =====================================================

function analyzeEvent(event) {
  try {
    return arRizqAI.analyzeNews({
      event: event.event,
      currency: event.currency,
      forecast: event.forecast,
      previous: event.previous,
      actual: event.actual
    });
  } catch (error) {
    console.error(
      "AI analysis error:",
      event.event,
      error.message
    );

    return {
      phase: "UNAVAILABLE",
      category: "UNKNOWN",
      bias: "NEUTRAL",
      signal: "NEUTRAL",
      confirmed: false,
      confidence: "NOT_CALIBRATED",
      explanation:
        "Analysis unavailable. Wait for verification.",
      pairs: [],
      scenarios: {}
    };
  }
}

function normalizeBias(value) {
  const s = String(value || "")
    .trim()
    .toUpperCase();

  if (
    s === "BULLISH" ||
    s === "BUY" ||
    s === "BUY_BIAS"
  ) {
    return "BULLISH";
  }

  if (
    s === "BEARISH" ||
    s === "SELL" ||
    s === "SELL_BIAS"
  ) {
    return "BEARISH";
  }

  return "NEUTRAL";
}

function buildAnalysis(events) {
  const intelligence = {};
  const ai_signals = {};
  const detailedSignals = [];

  for (const event of events) {
    const result = analyzeEvent(event);

    const actualAvailable = hasValue(event.actual);
    const forecastAvailable = hasValue(event.forecast);

    // A numeric actual is necessary, but is not sufficient:
    // the engine must also explicitly confirm its interpretation.
    const confirmed = Boolean(
      result.confirmed === true &&
      actualAvailable &&
      forecastAvailable
    );

    const bias = confirmed
      ? normalizeBias(result.bias || result.signal)
      : "NEUTRAL";

    const explanation = clean(
      result.explanation ||
      "Economic result requires verification."
    );

    const signal =
      bias === "BULLISH" ? "BULLISH" :
      bias === "BEARISH" ? "BEARISH" :
      "NEUTRAL";

    const pairRows = Array.isArray(result.pairs)
      ? result.pairs.map(pair => ({
          ...pair,
          direction: confirmed
            ? clean(pair.direction)
            : "NEUTRAL",
          confirmed
        }))
      : [];

    ai_signals[event.id] = {
      signal,
      bias,
      confirmed,
      probability: "Not calibrated",
      confidence: "NOT_CALIBRATED",
      desc: explanation,
      reason: explanation,
      phase: clean(result.phase),
      category: clean(result.category),
      pairs: pairRows
    };

    detailedSignals.push({
      eventId: event.id,
      event: event.event,
      currency: event.currency,
      date: event.date,
      isoTime: event.isoTime,
      phase: clean(result.phase),
      category: clean(result.category),
      bias,
      signal,
      confirmed,
      confidence: "NOT_CALIBRATED",
      explanation,
      scenarios: result.scenarios || {},
      forecast: event.forecast,
      previous: event.previous,
      actual: event.actual,
      pairs: pairRows,
      source: event.source,
      disclaimer:
        "Rule-based macro scenario. Not a calibrated " +
        "prediction or automatic trade recommendation."
    });
  }

  // Currency-level aggregation:
  // only confirmed, non-neutral event evidence is counted.
  // Conflicting evidence => NEUTRAL.
  // This is a simple consensus rule, not a probability model.

  for (const currency of CURRENCIES) {
    const rows = events.filter(
      event => event.currency === currency
    );

    let bullish = 0;
    let bearish = 0;
    let neutral = 0;

    for (const event of rows) {
      const signal = ai_signals[event.id];

      if (
        signal.confirmed &&
        signal.bias === "BULLISH"
      ) {
        bullish++;
      } else if (
        signal.confirmed &&
        signal.bias === "BEARISH"
      ) {
        bearish++;
      } else {
        neutral++;
      }
    }

    let outlook = "NEUTRAL";

    if (bullish > 0 && bearish === 0) {
      outlook = "BULLISH";
    } else if (bearish > 0 && bullish === 0) {
      outlook = "BEARISH";
    }

    intelligence[currency] = {
      outlook,
      confidence: "Not calibrated",
      eventCount: rows.length,
      green: bullish,
      red: bearish,
      purple: neutral,
      pending: rows.filter(
        event =>
          event.status === "UPCOMING" &&
          !hasValue(event.actual)
      ).length,

      explanation:
        bullish > 0 && bearish > 0
          ? "Conflicting confirmed economic releases. WAIT."
          : outlook === "NEUTRAL"
            ? "Insufficient confirmed directional evidence."
            : `${bullish + bearish} confirmed directional event(s).`
    };
  }

  return {
    intelligence,
    ai_signals,
    detailedSignals
  };
}

// =====================================================
// SHARED NEWS DATA LOADER
// =====================================================

async function loadNews(range, source) {
  const { from, to } = getBounds(range);

  const isFF = source !== "finance";

  const data = isFF
    ? readForexFactory()
    : await readFinanceCalendar(from, to);

  const raw_news = data.rows
    .map((row, index) =>
      normalize(
        row,
        index,
        isFF
          ? "FOREX_FACTORY_LOCAL"
          : "FINANCE_CALENDAR"
      )
    )
    .filter(Boolean)
    .filter(
      event =>
        event.date >= from &&
        event.date <= to
    )
    .sort((a, b) =>
      (a.isoTime || a.date)
        .localeCompare(b.isoTime || b.date)
    );

  return {
    range,
    from,
    to,
    isFF,
    data,
    raw_news,
    analysis: buildAnalysis(raw_news)
  };
}

// =====================================================
// API: TIME
// =====================================================

app.get("/api/time", (req, res) => {
  res.set("Cache-Control", "no-store");

  res.json({
    ok: true,
    timezone: ZONE,
    nowIso: new Date().toISOString(),
    nowIST: fullIST(),
    dateIST: dateIST()
  });
});

// =====================================================
// API: HEALTH
// =====================================================

app.get("/api/health", (req, res) => {
  res.set("Cache-Control", "no-store");

  res.json({
    ok: true,
    service: "AR-RIZQ TERMINAL",
    status: "running",
    timezone: ZONE,
    forexFactoryFilePresent:
      fs.existsSync(FF_FILE),
    aiEngineLoaded: true,
    serverTime: fullIST()
  });
});

// =====================================================
// API: NEWS INTELLIGENCE
// Existing frontend response preserved.
// =====================================================

app.get("/api/news-ai-bias", async (req, res) => {
  res.set("Cache-Control", "no-store");

  const allowed = [
    "today",
    "this_week",
    "next_week",
    "this_month",
    "next_month",
    "all"
  ];

  const range = allowed.includes(req.query.range)
    ? req.query.range
    : "today";

  const source = req.query.source === "finance"
    ? "finance"
    : "forex_factory";

  try {
    const result = await loadNews(
      range,
      source
    );

    const now = new Date();

    res.json({
      ok: true,
      range: result.range,
      from: result.from,
      to: result.to,
      timezone: ZONE,
      generatedAtIso: now.toISOString(),
      generatedAtIST: fullIST(now),
      lastUpdated: now.toISOString(),
      sourceFetchedAt:
        result.data.fetchedAt,

      source: result.isFF
        ? "Forex Factory local weekly snapshot"
        : "Finance Calendar",

      dataMode: result.isFF
        ? "LOCAL_SNAPSHOT"
        : "PROVIDER_CALENDAR",

      liveCalendarConnected: false,

      notice: result.isFF
        ? "Local weekly snapshot. Not a live feed."
        : "Provider data; real-time completeness " +
          "and accuracy are not independently verified.",

      raw_news: result.raw_news,

      intelligence:
        result.analysis.intelligence,

      ai_signals:
        result.analysis.ai_signals
    });

  } catch (error) {
    console.error(
      "News API error:",
      error.message
    );

    res.status(503).json({
      ok: false,
      range,
      source,
      dataMode: "SOURCE_UNAVAILABLE",
      liveCalendarConnected: false,
      error: error.message,
      raw_news: [],
      intelligence:
        buildAnalysis([]).intelligence,
      ai_signals: {}
    });
  }
});

// =====================================================
// API: DETAILED AI SIGNALS
// Same engine and event IDs as News Intelligence.
// =====================================================

app.get("/api/ai-signals", async (req, res) => {
  res.set("Cache-Control", "no-store");

  const allowed = [
    "today",
    "this_week",
    "next_week",
    "this_month",
    "next_month",
    "all"
  ];

  const range = allowed.includes(req.query.range)
    ? req.query.range
    : "this_week";

  const source = req.query.source === "finance"
    ? "finance"
    : "forex_factory";

  try {
    const result = await loadNews(
      range,
      source
    );

    res.json({
      ok: true,
      engine: "AR-RIZQ MACRO SCENARIO ENGINE",
      modelType: "RULE_BASED",
      trainedAI: false,
      source: result.isFF
        ? "Forex Factory local snapshot"
        : "Finance Calendar",
      liveData: false,
      range,
      generatedAt: new Date().toISOString(),
      eventsAnalyzed:
        result.analysis.detailedSignals.length,
      signals:
        result.analysis.detailedSignals,
      intelligence:
        result.analysis.intelligence
    });

  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error.message,
      signals: []
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `AR-RIZQ Terminal running on ${PORT}`
  );

  console.log(`Timezone: ${ZONE}`);

  console.log(
    "Forex Factory JSON:",
    fs.existsSync(FF_FILE)
      ? "FOUND"
      : "MISSING"
  );

  console.log(
    `News API: http://localhost:${PORT}/api/news-ai-bias?range=this_week`
  );

  console.log(
    `AI API: http://localhost:${PORT}/api/ai-signals`
  );
});
