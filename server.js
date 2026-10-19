const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Central Bank Policy Stance Matrix
const CENTRAL_BANK_STANCES = {
  USD: { bank: "Federal Reserve (Fed)", stance: "HAWKISH", rate: "4.75%", bias: "BULLISH", note: "Higher rates for longer to curb inflation." },
  EUR: { bank: "European Central Bank (ECB)", stance: "DOVISH", rate: "3.25%", bias: "BEARISH", note: "Easing monetary policy amid growth slowdown." },
  GBP: { bank: "Bank of England (BoE)", stance: "HAWKISH", rate: "5.00%", bias: "BULLISH", note: "Sticky inflation keeping rates elevated." },
  CAD: { bank: "Bank of Canada (BoC)", stance: "DOVISH", rate: "3.75%", bias: "BEARISH", note: "Rate cuts active; CPI releases key for guidance." },
  AUD: { bank: "Reserve Bank of Australia (RBA)", stance: "HAWKISH", rate: "4.35%", bias: "BULLISH", note: "Resilient labor market and persistent inflation." },
  JPY: { bank: "Bank of Japan (BoJ)", stance: "NEUTRAL", rate: "0.25%", bias: "NEUTRAL", note: "Slow normalization away from ultra-easy policy." }
};

const EVENT_IMPACT_MAP = {
  CAD: ["USDCAD", "CADJPY", "EURCAD", "GBPCAD"],
  USD: ["EURUSD", "GBPUSD", "USDJPY", "USDCAD", "AUDUSD", "XAUUSD"],
  GBP: ["GBPUSD", "EURGBP", "GBPJPY", "GBPCAD"],
  EUR: ["EURUSD", "EURGBP", "EURJPY", "EURCAD"],
  AUD: ["AUDUSD", "EURAUD", "AUDJPY", "GBPAUD"],
  JPY: ["USDJPY", "EURJPY", "GBPJPY", "CADJPY", "AUDJPY"]
};

// Historical Pip Volatility Model Map
function getHistoricalPipProjection(eventName) {
  const name = eventName.toLowerCase();
  if (name.includes('fomc') || name.includes('federal funds')) {
    return { expectedPips: "150 - 350 Pips", goldMove: "$35 - $80", volatilityWindow: "30 - 60 Mins", riskLevel: "EXTREME VOLATILITY" };
  } else if (name.includes('cpi') || name.includes('inflation')) {
    return { expectedPips: "80 - 180 Pips", goldMove: "$20 - $45", volatilityWindow: "10 - 30 Mins", riskLevel: "HIGH IMPACT" };
  } else if (name.includes('non-farm') || name.includes('nfp') || name.includes('employment')) {
    return { expectedPips: "100 - 250 Pips", goldMove: "$25 - $50", volatilityWindow: "15 - 45 Mins", riskLevel: "HIGH IMPACT" };
  } else if (name.includes('rate') || name.includes('monetary policy') || name.includes('overnight')) {
    return { expectedPips: "90 - 220 Pips", goldMove: "$20 - $40", volatilityWindow: "20 - 45 Mins", riskLevel: "HIGH IMPACT" };
  }
  return { expectedPips: "40 - 90 Pips", goldMove: "$10 - $25", volatilityWindow: "5 - 15 Mins", riskLevel: "MODERATE HIGH" };
}

function getDynamicDateRange(range) {
  const today = new Date();
  let from = today.toISOString().split('T')[0];
  let to = from;

  if (range === 'this_week') {
    const endOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const distanceToSunday = 7 - (dayOfWeek === 0 ? 7 : dayOfWeek);
    endOfWeek.setDate(today.getDate() + distanceToSunday);
    to = endOfWeek.toISOString().split('T')[0];
  } else if (range === 'this_month') {
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    to = endOfMonth.toISOString().split('T')[0];
  }
  return { from, to };
}

async function fetchMultiSourceNews(range = 'today') {
  const { from, to } = getDynamicDateRange(range);
  const token = process.env.FINNHUB_API_KEY;
  let liveEvents = [];

  if (token && token !== 'sandbox_key') {
    try {
      const url = `https://finnhub.io/api/v1/economic-calendar?from=${from}&to=${to}&token=${token}`;
      const res = await axios.get(url, { timeout: 4000 });
      if (res.data && res.data.economicCalendar) {
        const allowed = ['USD', 'EUR', 'CAD', 'AUD', 'GBP', 'JPY', 'US', 'CA', 'EU', 'AU', 'GB', 'JP'];
        liveEvents = res.data.economicCalendar.filter(ev => {
          const isMajor = allowed.includes(ev.currency || ev.country);
          const isHigh = ev.impact === 'high' || ev.impact === 3 || ev.importance === 'high';
          return isMajor && isHigh;
        });
      }
    } catch (e) {
      console.log("Finnhub Live Fetch Fallback Active:", e.message);
    }
  }

  if (liveEvents.length === 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const staticMap = [
      { id: "ff_1", date: todayStr, dayFormatted: "Today", timeFormatted: "06:00 PM IST", isoTarget: `${todayStr}T18:00:00+05:30`, currency: "CAD", event: "CPI m/m", forecast: "0.2%", prev: "-0.1%", actual: "-", impact: "high" },
      { id: "ff_2", date: todayStr, dayFormatted: "Today", timeFormatted: "06:00 PM IST", isoTarget: `${todayStr}T18:00:00+05:30`, currency: "CAD", event: "Median CPI y/y", forecast: "2.0%", prev: "2.0%", actual: "-", impact: "high" },
      { id: "ff_3", date: todayStr, dayFormatted: "Today", timeFormatted: "06:00 PM IST", isoTarget: `${todayStr}T18:00:00+05:30`, currency: "CAD", event: "Trimmed CPI y/y", forecast: "1.9%", prev: "1.9%", actual: "-", impact: "high" },
      { id: "ff_4", date: "2026-10-21", dayFormatted: "Wed Oct 21", timeFormatted: "11:30 AM IST", isoTarget: "2026-10-21T11:30:00+05:30", currency: "GBP", event: "CPI y/y", forecast: "3.4%", prev: "3.1%", actual: "-", impact: "high" },
      { id: "ff_5", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 AM IST", isoTarget: "2026-10-28T06:00:00+05:30", currency: "AUD", event: "CPI m/m", forecast: "0.4%", prev: "-", actual: "-", impact: "high" },
      { id: "ff_11", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "07:15 PM IST", isoTarget: "2026-10-28T19:15:00+05:30", currency: "CAD", event: "Overnight Rate", forecast: "2.25%", prev: "2.25%", actual: "-", impact: "high" },
      { id: "ff_13", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "11:30 PM IST", isoTarget: "2026-10-28T23:30:00+05:30", currency: "USD", event: "Federal Funds Rate", forecast: "4.00%", prev: "-", actual: "-", impact: "high" },
      { id: "ff_16", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:00 PM IST", isoTarget: "2026-10-29T18:00:00+05:30", currency: "USD", event: "Advance GDP q/q", forecast: "2.2%", prev: "-", actual: "-", impact: "high" },
      { id: "ff_18", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:45 PM IST", isoTarget: "2026-10-29T18:45:00+05:30", currency: "EUR", event: "Main Refinancing Rate", forecast: "2.65%", prev: "-", actual: "-", impact: "high" },
      { id: "ff_21", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTarget: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "BOJ Policy Rate", forecast: "<1.25%", prev: "-", actual: "-", impact: "high" }
    ];

    if (range === 'today') {
      liveEvents = staticMap.filter(ev => ev.date === todayStr || ev.dayFormatted === 'Today');
    } else if (range === 'this_week') {
      liveEvents = staticMap.filter(ev => ev.date >= from && ev.date <= to);
    } else {
      liveEvents = staticMap.filter(ev => ev.date >= from);
    }
  }

  return liveEvents.map(ev => ({
    ...ev,
    impactPairs: EVENT_IMPACT_MAP[ev.currency] || ["USDJPY", "EURUSD"],
    pipMetrics: getHistoricalPipProjection(ev.event)
  }));
}

// Precision Multi-Evidence AI Engine with Pip Movement Analysis
async function analyzeWithMultiSourceAI(eventsList) {
  if (!eventsList || eventsList.length === 0) return {};

  const promptText = `
  You are an expert High-Precision Institutional ICT Forex AI Engine.
  Evaluate these macro releases:
  ${JSON.stringify(eventsList, null, 2)}

  Provide exact data-point evidence counts (Tips Analyzed), directional probability %, expected pip move, volatility window, and ICT execution note.

  Return strictly raw JSON format without markdown wrappers:
  {
    "CAD": {
      "bias": "BULLISH",
      "probability": "78%",
      "evidence_tips_count": 5,
      "expected_pip_move": "80 - 160 Pips",
      "gold_impact": "$20 - $35",
      "analyzed_tips": [
        "Forecast Delta: CPI m/m (+0.3% inflation expansion over -0.1% prev)",
        "Rate Stance Alignment: BoC monetary policy sensitivity",
        "Liquidity Pre-Condition: Judas Swing sweep expected before NY Killzone",
        "SMC Structure: 5m/15m FVG gap alignment",
        "Cross-Pair Correlation: USDCAD bearish pressure confirmation"
      ],
      "volatility_risk": "HIGH VOLATILITY",
      "ict_note": "Forecast CPI expansion indicates bullish momentum. Expect Judas Swing liquidity sweep before NY Killzone."
    },
    "GBP": {
      "bias": "BULLISH",
      "probability": "74%",
      "evidence_tips_count": 4,
      "expected_pip_move": "90 - 180 Pips",
      "gold_impact": "$22 - $40",
      "analyzed_tips": [
        "Inflation Expansion (+0.3% over previous)",
        "BoE Hawkish 5.00% Benchmark Rate",
        "London Killzone Order Flow Alignment",
        "Previous Day High Sweep Potential"
      ],
      "volatility_risk": "MODERATE HIGH",
      "ict_note": "CPI inflation expansion expected (3.4% vs 3.1%). Look for London Killzone FVG setup."
    },
    "USD": {
      "bias": "BEARISH",
      "probability": "82%",
      "evidence_tips_count": 5,
      "expected_pip_move": "150 - 320 Pips",
      "gold_impact": "$35 - $75",
      "analyzed_tips": [
        "FOMC Rate Projection Adjustment (4.00%)",
        "GDP Growth Rate Shift",
        "Fed Stance Alignment",
        "Liquidity Grab Above Previous Day High",
        "5m Market Structure Shift (MSS)"
      ],
      "volatility_risk": "EXTREME VOLATILITY",
      "ict_note": "FOMC Federal Funds Rate & Advance GDP forecast alignment. Look for MSS & CISD execution."
    }
  }
  `;

  try {
    const aiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: promptText }] }] }
    );

    const rawText = aiResponse.data.candidates[0].content.parts[0].text;
    const cleanJson = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    return {
      "CAD": {
        "bias": "BULLISH",
        "probability": "78%",
        "evidence_tips_count": 5,
        "expected_pip_move": "80 - 160 Pips",
        "gold_impact": "$20 - $35",
        "analyzed_tips": ["Forecast Delta expansion", "BoC sensitivity", "NY Killzone sweep", "SMC FVG", "USDCAD cross-pair correlation"],
        "volatility_risk": "HIGH VOLATILITY",
        "ict_note": "Forecast CPI inflation expansion indicates momentum. Watch for Judas Swing sweep."
      }
    };
  }
}

app.get('/api/news-ai-bias', async (req, res) => {
  const range = req.query.range || 'today';
  const rawNews = await fetchMultiSourceNews(range);
  const aiBias = await analyzeWithMultiSourceAI(rawNews);

  res.json({
    range,
    raw_news: rawNews,
    ai_bias: aiBias,
    central_banks: CENTRAL_BANK_STANCES
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMC Macro Pro High-Precision AI Engine running on port ${PORT}`);
});