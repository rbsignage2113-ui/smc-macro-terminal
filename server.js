const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Frontend files-ku

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 1. Fetch Economic News (Using Finnhub API as example or fallback mock data)
async function getEconomicNews() {
  try {
    // Neenga unga live calendar API key inga podalam (e.g., Finnhub)
    const token = process.env.FINNHUB_API_KEY || "sandbox_key_or_free_token";
    const response = await axios.get(`https://finnhub.io/api/v1/economic-calendar?token=${token}`);
    
    if (response.data && response.data.economicCalendar) {
      const usHighImpact = response.data.economicCalendar.filter(event => 
        event.country === 'US' && (event.impact === 'high' || event.impact === 3)
      );
      if (usHighImpact.length > 0) return usHighImpact[0];
    }
    
    // Fallback Mock Data if API limit or no key active yet
    return {
      event: "US Core CPI m/m",
      actual: "Pending",
      estimate: "0.3%",
      prev: "0.2%",
      country: "US",
      time: "18:30 GMT"
    };
  } catch (error) {
    console.error("News Fetch Error:", error.message);
    return {
      event: "US FOMC Rate Decision",
      actual: "5.50%",
      estimate: "5.50%",
      prev: "5.50%",
      country: "US",
      time: "20:00 GMT"
    };
  }
}

// 2. AI Prompt Engine for ICT Analysis (Gemini API)
async function analyzeNewsWithAI(newsData) {
  const promptText = `
  You are an expert Institutional ICT (Inner Circle Trader) News Analyst for an SMC Forex/Crypto Terminal.
  Analyze this US High Impact News event:
  
  Event: ${newsData.event}
  Actual: ${newsData.actual}
  Forecast / Estimate: ${newsData.estimate}
  Previous: ${newsData.prev}

  Strictly return ONLY a valid JSON object (no markdown, no extra text) with these exact keys:
  {
    "currency_impact": "USD STRENGTH" or "USD WEAKNESS" or "NEUTRAL",
    "usd_status": "BULLISH" or "BEARISH",
    "gold_status": "BULLISH" or "BEARISH",
    "eur_status": "BULLISH" or "BEARISH",
    "ict_tactical_note": "Write a 2-sentence actionable ICT strategy note (mention Killzones, Liquidity sweeps, FVG or MSS)."
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
      currency_impact: "HIGH VOLATILITY",
      usd_status: "NEUTRAL",
      gold_status: "NEUTRAL",
      eur_status: "NEUTRAL",
      ict_tactical_note: "Error fetching AI bias. Wait for Asian/London session high-low liquidity sweep before entry."
    };
  }
}

// 3. API Endpoint for SMC Dashboard UI
app.get('/api/news-ai-bias', async (req, res) => {
  const news = await getEconomicNews();
  const aiAnalysis = await analyzeNewsWithAI(news);
  
  res.json({
    timestamp: new Date().toISOString(),
    raw_news: news,
    ai_bias: aiAnalysis
  });
});

app.listen(PORT, () => {
  console.log(`🚀 SMC Terminal Server running smoothly on port ${PORT}`);
});