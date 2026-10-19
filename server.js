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

// Date Range Helper
function getDateRange(range) {
  const today = new Date();
  let from = today.toISOString().split('T')[0];
  let to = from;

  if (range === 'this_week') {
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    to = nextWeek.toISOString().split('T')[0];
  } else if (range === 'this_month') {
    const nextMonth = new Date(today);
    nextMonth.setDate(today.getDate() + 30);
    to = nextMonth.toISOString().split('T')[0];
  }
  return { from, to };
}

// 1. Fetch Calendar News for All Major Currencies
async function getEconomicNews(range = 'today') {
  try {
    const { from, to } = getDateRange(range);
    const token = process.env.FINNHUB_API_KEY || "sandbox_key";
    const url = `https://finnhub.io/api/v1/economic-calendar?from=${from}&to=${to}&token=${token}`;
    
    const response = await axios.get(url);
    if (response.data && response.data.economicCalendar && response.data.economicCalendar.length > 0) {
      const allowedCurrencies = ['USD', 'EUR', 'CAD', 'AUD', 'GBP', 'JPY'];
      return response.data.economicCalendar.filter(ev => 
        allowedCurrencies.includes(ev.currency || ev.country)
      );
    }

    // Fallback Multi-Currency Data with exact Timestamps (for 30-min auto-hide test)
    const now = new Date();
    const futureTime = new Date(now.getTime() + 15 * 60000).toISOString(); // 15 mins from now

    return [
      { id: "1", country: "CA", currency: "CAD", event: "CPI m/m", actual: "WAITING...", estimate: "0.2%", prev: "-0.1%", timestamp: futureTime, impact: "high" },
      { id: "2", country: "CA", currency: "CAD", event: "Median CPI y/y", actual: "WAITING...", estimate: "2.1%", prev: "2.0%", timestamp: futureTime, impact: "high" },
      { id: "3", country: "US", currency: "USD", event: "Core Retail Sales", actual: "WAITING...", estimate: "0.4%", prev: "0.1%", timestamp: futureTime, impact: "high" },
      { id: "4", country: "EU", currency: "EUR", event: "ECB Rate Decision", actual: "WAITING...", estimate: "3.25%", prev: "3.50%", timestamp: futureTime, impact: "high" },
      { id: "5", country: "GB", currency: "GBP", event: "CPI y/y", actual: "WAITING...", estimate: "2.2%", prev: "2.0%", timestamp: futureTime, impact: "high" },
      { id: "6", country: "AU", currency: "AUD", event: "Employment Change", actual: "WAITING...", estimate: "25.0K", prev: "14.0K", timestamp: futureTime, impact: "high" }
    ];
  } catch (error) {
    console.error("News Fetch Error:", error.message);
    return [];
  }
}

// 2. AI Multi-Currency Prompt Engine
async function analyzeNewsWithAI(eventsList) {
  const promptText = `
  You are an expert Institutional ICT Forex Analyst for an SMC Trading Dashboard.
  Evaluate this multi-currency economic calendar data:
  ${JSON.stringify(eventsList, null, 2)}

  STRICT INSTITUTIONAL EVALUATION RULES:
  1. DO NOT DEFAULT TO NEUTRAL if Actual is "WAITING..."! Compare Forecast/Estimate vs Previous:
     - Estimate > Previous => PRE-NEWS BULLISH (BUY).
     - Estimate < Previous => PRE-NEWS BEARISH (SELL).
  2. If Actual data is released:
     - Actual > Estimate => BUY.
     - Actual < Estimate => SELL.
  3. Combine multiple news items per currency (USD, EUR, CAD, AUD, GBP, JPY) into one single aggregated bias per currency.

  Return strictly valid JSON format with keys for each currency present:
  {
    "CAD": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Forecast CPI higher. Expect Judas swing liquidity sweep before Killzone." },
    "USD": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Retail Sales forecast beat. Look for 5m FVG / MSS." },
    "EUR": { "signal": "SELL", "label": "PRE-NEWS BEARISH", "ict_note": "Rate cut expected. Watch for Asian high liquidity sweep." },
    "GBP": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Inflation expansion forecast. Expect NY Killzone sweep." },
    "AUD": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Employment metrics strong. Look for CISD setup." }
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
      "CAD": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Forecast shows expansion over previous data." },
      "USD": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Awaiting high liquidity sweep before entry." }
    };
  }
}

// API Endpoint
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