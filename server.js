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

// 1. Fetch Today's All Major Currency High-Impact News Events
async function getAllEconomicNews() {
  try {
    const token = process.env.FINNHUB_API_KEY || "sandbox_key";
    const response = await axios.get(`https://finnhub.io/api/v1/economic-calendar?token=${token}`);
    
    if (response.data && response.data.economicCalendar) {
      // Filter High Impact Events for Major Currencies
      const majorCurrencies = ['US', 'CA', 'JP', 'AU', 'EU', 'GB', 'NZ', 'CH'];
      const highImpactEvents = response.data.economicCalendar.filter(event => 
        majorCurrencies.includes(event.country) && (event.impact === 'high' || event.impact === 3)
      );
      if (highImpactEvents.length > 0) return highImpactEvents;
    }
    
    // Fallback Mock Events (Simulating Multiple News like 3 CAD events today)
    return [
      { country: "CA", event: "Employment Change", actual: "40.5K", estimate: "25.0K", prev: "12.0K" },
      { country: "CA", event: "Unemployment Rate", actual: "5.8%", estimate: "6.1%", prev: "6.2%" },
      { country: "CA", event: "Ivey PMI", actual: "56.4", estimate: "52.0", prev: "51.2" },
      { country: "US", event: "Core CPI m/m", actual: "0.4%", estimate: "0.3%", prev: "0.2%" }
    ];
  } catch (error) {
    console.error("News Fetch Error:", error.message);
    return [
      { country: "CA", event: "CAD High Impact Release Suite", actual: "Positive", estimate: "Mixed", prev: "Neutral" }
    ];
  }
}

// 2. Comprehensive AI Multi-News Prompt Engine (ICT / SMC Logic)
async function analyzeNewsWithAI(eventsList) {
  const promptText = `
  You are an expert Institutional ICT (Inner Circle Trader) News Analyst for an SMC Trading Dashboard.
  
  Below is today's High Impact Economic Calendar Data across major currencies (USD, CAD, JPY, AUD, EUR, GBP, NZD, CHF). 
  NOTE: There might be multiple news releases for a single currency (e.g. 3 CAD events at once). 
  You MUST COMBINE AND AGGREGATE all individual data points per currency to derive a net institutional consensus.

  Today's Events:
  ${JSON.stringify(eventsList, null, 2)}

  Strict Institutional Rules:
  1. If Actual > Forecast across multiple events for a currency => Strong BUY (Bullish).
  2. If Actual < Forecast across multiple events => Strong SELL (Bearish).
  3. If data is conflicting or mixed across events => Signal NEUTRAL / NO-TRADE.
  4. Derive net bias for key traded assets: USDCAD, XAUUSD, EURUSD, GBPUSD, AUDUSD, USDJPY.

  Return ONLY a raw, strictly valid JSON object without markdown formatting using this structure:
  {
    "primary_focus_currency": "CAD",
    "overall_market_sentiment": "BUY", 
    "currency_bias_summary": [
      {"currency": "USD", "decision": "BUY", "reason": "CPI beat forecast"},
      {"currency": "CAD", "decision": "BUY", "reason": "Employment Change & PMI beat expectations, Unemployment fell"},
      {"currency": "JPY", "decision": "NEUTRAL", "reason": "No high impact data today"}
    ],
    "pair_biases": {
      "USDCAD": "NEUTRAL",
      "XAUUSD": "SELL",
      "EURUSD": "SELL",
      "GBPUSD": "SELL",
      "AUDUSD": "SELL",
      "USDJPY": "BUY"
    },
    "ict_tactical_note": "Combined CAD news is strongly bullish while USD is also strong. USDCAD is in a high-volatility range. Wait for Asian/London session high liquidity sweep and 5m Market Structure Shift (MSS) before entering."
  }
  `;

  try {
    const aiResponse = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: promptText }] }]
      }
    );

    const rawText = aiResponse.data.candidates[0].content.parts[0].text;
    const cleanJsonString = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJsonString);
  } catch (err) {
    console.error("AI Analysis Error:", err.message);
    return {
      primary_focus_currency: "ALL",
      overall_market_sentiment: "NEUTRAL",
      currency_bias_summary: [
        {"currency": "USD", "decision": "NEUTRAL", "reason": "Awaiting API sync"},
        {"currency": "CAD", "decision": "NEUTRAL", "reason": "Awaiting API sync"}
      ],
      pair_biases: {
        "USDCAD": "NEUTRAL",
        "XAUUSD": "NEUTRAL",
        "EURUSD": "NEUTRAL",
        "GBPUSD": "NEUTRAL",
        "AUDUSD": "NEUTRAL",
        "USDJPY": "NEUTRAL"
      },
      ict_tactical_note: "High volatility expected. Wait for liquidity sweeps around Asian session High/Low before looking for CISD or FVG entries."
    };
  }
}

// 3. API Endpoint
app.get('/api/news-ai-bias', async (req, res) => {
  const newsList = await getAllEconomicNews();
  const aiAnalysis = await analyzeNewsWithAI(newsList);
  
  res.json({
    timestamp: new Date().toISOString(),
    raw_news_count: newsList.length,
    raw_news: newsList,
    ai_bias: aiAnalysis
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMC News AI Engine running on port ${PORT}`);
});