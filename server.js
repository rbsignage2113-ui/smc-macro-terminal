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

// Strictly fetch REAL Live Red Folder High Impact Events
async function getEconomicNews(range = 'today') {
  try {
    const { from, to } = getDateRange(range);
    const token = process.env.FINNHUB_API_KEY;
    
    if (token) {
      const url = `https://finnhub.io/api/v1/economic-calendar?from=${from}&to=${to}&token=${token}`;
      const response = await axios.get(url);
      
      if (response.data && response.data.economicCalendar) {
        const allowedCurrencies = ['USD', 'EUR', 'CAD', 'AUD', 'GBP', 'JPY', 'US', 'CA', 'EU', 'AU', 'GB', 'JP'];
        
        // Strict Filter: ONLY High Impact Red Folder Events
        return response.data.economicCalendar.filter(ev => {
          const isMajor = allowedCurrencies.includes(ev.currency || ev.country);
          const isHighImpact = ev.impact === 'high' || ev.impact === 3 || ev.importance === 'high';
          return isMajor && isHighImpact;
        });
      }
    }
  } catch (error) {
    console.error("News Fetch Error:", error.message);
  }

  // If no RED FOLDER event is scheduled on Forex Factory for today, return EMPTY array!
  return [];
}

async function analyzeNewsWithAI(eventsList) {
  if (!eventsList || eventsList.length === 0) {
    return {};
  }

  const promptText = `
  You are an expert Institutional ICT Forex Analyst. Evaluate these high-impact red folder events:
  ${JSON.stringify(eventsList, null, 2)}

  Rules:
  1. If Actual is WAITING..., compare Estimate vs Previous (Estimate > Previous => BUY, Estimate < Previous => SELL).
  2. Combine multiple events per currency into one consolidated signal.

  Return strictly valid JSON format:
  {
    "CAD": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Inflation forecast higher. Expect Judas Swing liquidity sweep before Killzone." },
    "USD": { "signal": "BUY", "label": "PRE-NEWS BULLISH", "ict_note": "Retail Sales forecast beat." }
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
    return {};
  }
}

app.get('/api/news-ai-bias', async (req, res) => {
  const range = req.query.range || 'today';
  const rawNews = await getEconomicNews(range);
  const aiBias = await analyzeNewsWithAI(rawNews);

  res.json({ range, raw_news: rawNews, ai_bias: aiBias });
});

app.listen(PORT, () => {
  console.log(`🚀 SMC Macro Pro Terminal running on port ${PORT}`);
});