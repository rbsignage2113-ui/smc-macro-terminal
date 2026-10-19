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

// Date Helper Function
function getDateRange(range) {
  const today = new Date();
  let from = today.toISOString().split('T')[0];
  let to = from;

  if (range === 'this_week') {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    to = nextWeek.toISOString().split('T')[0];
  } else if (range === 'next_week') {
    const startNext = new Date(today);
    startNext.setDate(today.getDate() + 7);
    const endNext = new Date(today);
    endNext.setDate(today.getDate() + 14);
    from = startNext.toISOString().split('T')[0];
    to = endNext.toISOString().split('T')[0];
  }
  return { from, to };
}

// 1. Fetch Calendar News
async function getEconomicNews(range = 'today') {
  try {
    const { from, to } = getDateRange(range);
    const token = process.env.FINNHUB_API_KEY || "sandbox_key";
    const url = `https://finnhub.io/api/v1/economic-calendar?from=${from}&to=${to}&token=${token}`;
    
    const response = await axios.get(url);
    if (response.data && response.data.economicCalendar && response.data.economicCalendar.length > 0) {
      return response.data.economicCalendar;
    }

    // Fallback Mock Data for Today (Simulating CAD 3 Red Folder Events)
    return [
      { country: "CA", currency: "CAD", event: "CPI m/m", actual: "WAITING...", estimate: "0.2%", prev: "-0.1%", date: "Today", impact: "high" },
      { country: "CA", currency: "CAD", event: "Median CPI y/y", actual: "WAITING...", estimate: "2.1%", prev: "2.0%", date: "Today", impact: "high" },
      { country: "CA", currency: "CAD", event: "Trimmed Mean CPI y/y", actual: "WAITING...", estimate: "2.0%", prev: "1.9%", date: "Today", impact: "high" },
      { country: "US", currency: "USD", event: "Building Permits", actual: "1.45M", estimate: "1.42M", prev: "1.40M", date: "Today", impact: "high" }
    ];
  } catch (error) {
    console.error("News Fetch Error:", error.message);
    return [
      { country: "CA", currency: "CAD", event: "CPI m/m", actual: "WAITING...", estimate: "0.2%", prev: "-0.1%", date: "Today", impact: "high" },
      { country: "CA", currency: "CAD", event: "Median CPI y/y", actual: "WAITING...", estimate: "2.1%", prev: "2.0%", date: "Today", impact: "high" },
      { country: "CA", currency: "CAD", event: "Trimmed Mean CPI y/y", actual: "WAITING...", estimate: "2.0%", prev: "1.9%", date: "Today", impact: "high" }
    ];
  }
}

// 2. Strict AI Engine for Combined Events & Pre-News Prediction Bias
async function analyzeNewsWithAI(eventsList) {
  const promptText = `
  You are an expert Institutional ICT (Smart Money Concepts) Forex Trader.
  Analyze the following economic calendar events for today:
  ${JSON.stringify(eventsList, null, 2)}

  STRICT INSTITUTIONAL EVALUATION RULES:
  1. DO NOT DEFAULT TO NEUTRAL if Actual is "WAITING..."! Compare Forecast/Estimate vs Previous:
     - If Estimate > Previous across majority of events for a currency => Give PRE-NEWS BULLISH (BUY).
     - If Estimate < Previous across majority of events => Give PRE-NEWS BEARISH (SELL).
  2. If Actual data is released:
     - Actual > Estimate => Strong BUY.
     - Actual < Estimate => Strong SELL.
  3. Combine multiple news items for each currency (e.g., 3 CAD CPI releases together) into ONE clear combined signal.

  Return strictly raw JSON format without markdown code blocks:
  {
    "CAD": {
      "signal": "BUY",
      "label": "PRE-NEWS BULLISH (CPI FORECAST HIGHER)",
      "ict_note": "Inflation forecast higher than previous (-0.1% vs 0.2%). Expect pre-news Judas Swing liquidity sweep before Killzone expansion."
    },
    "USD": {
      "signal": "BUY",
      "label": "STRONG BULLISH (ACTUAL BEAT FORECAST)",
      "ict_note": "Building permits beat expectations (1.45M vs 1.42M). Look for 5m FVG / Market Structure Shift for longs."
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
    console.error("AI Analysis Error:", err.message);
    return {
      "CAD": {
        "signal": "BUY",
        "label": "PRE-NEWS BULLISH",
        "ict_note": "Forecast shows expansion over previous data. Watch for London/NY Killzone liquidity sweep."
      }
    };
  }
}

// API Endpoint for SMC Dashboard UI
app.get('/api/news-ai-bias', async (req, res) => {
  const range = req.query.range || 'today';
  const rawNews = await getEconomicNews(range);
  const aiBias = await analyzeNewsWithAI(rawNews);

  res.json({
    range: range,
    raw_news: rawNews,
    ai_bias: aiBias
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMC Macro Pro Terminal Server running on port ${PORT}`);
});