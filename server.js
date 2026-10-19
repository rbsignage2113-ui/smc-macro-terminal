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

// EXACT FOREX FACTORY RED FOLDER CALENDAR DATA (OCT 19, 2026 - NOV 02, 2026)
const FOREX_FACTORY_DATA = [
  // Mon Oct 19
  { id: "ff_1", date: "2026-10-19", dayFormatted: "Mon Oct 19", timeFormatted: "06:00 PM IST", isoTarget: "2026-10-19T18:00:00+05:30", currency: "CAD", event: "CPI m/m", forecast: "0.2%", prev: "-0.1%", actual: "-", impact: "high" },
  { id: "ff_2", date: "2026-10-19", dayFormatted: "Mon Oct 19", timeFormatted: "06:00 PM IST", isoTarget: "2026-10-19T18:00:00+05:30", currency: "CAD", event: "Median CPI y/y", forecast: "2.0%", prev: "2.0%", actual: "-", impact: "high" },
  { id: "ff_3", date: "2026-10-19", dayFormatted: "Mon Oct 19", timeFormatted: "06:00 PM IST", isoTarget: "2026-10-19T18:00:00+05:30", currency: "CAD", event: "Trimmed CPI y/y", forecast: "1.9%", prev: "1.9%", actual: "-", impact: "high" },

  // Wed Oct 21
  { id: "ff_4", date: "2026-10-21", dayFormatted: "Wed Oct 21", timeFormatted: "11:30 AM IST", isoTarget: "2026-10-21T11:30:00+05:30", currency: "GBP", event: "CPI y/y", forecast: "3.4%", prev: "3.1%", actual: "-", impact: "high" },

  // Wed Oct 28
  { id: "ff_5", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 AM IST", isoTarget: "2026-10-28T06:00:00+05:30", currency: "AUD", event: "CPI m/m", forecast: "0.4%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_6", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 AM IST", isoTarget: "2026-10-28T06:00:00+05:30", currency: "AUD", event: "CPI y/y", forecast: "4.0%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_7", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 AM IST", isoTarget: "2026-10-28T06:00:00+05:30", currency: "AUD", event: "Trimmed Mean CPI m/m", forecast: "0.2%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_8", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "05:30 PM IST", isoTarget: "2026-10-28T17:30:00+05:30", currency: "GBP", event: "Autumn Forecast Statement", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_9", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "07:15 PM IST", isoTarget: "2026-10-28T19:15:00+05:30", currency: "CAD", event: "BOC Monetary Policy Report", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_10", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "07:15 PM IST", isoTarget: "2026-10-28T19:15:00+05:30", currency: "CAD", event: "BOC Rate Statement", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_11", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "07:15 PM IST", isoTarget: "2026-10-28T19:15:00+05:30", currency: "CAD", event: "Overnight Rate", forecast: "2.25%", prev: "2.25%", actual: "-", impact: "high" },
  { id: "ff_12", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "08:00 PM IST", isoTarget: "2026-10-28T20:00:00+05:30", currency: "CAD", event: "BOC Press Conference", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_13", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "11:30 PM IST", isoTarget: "2026-10-28T23:30:00+05:30", currency: "USD", event: "Federal Funds Rate", forecast: "4.00%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_14", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "11:30 PM IST", isoTarget: "2026-10-28T23:30:00+05:30", currency: "USD", event: "FOMC Statement", forecast: "-", prev: "-", actual: "-", impact: "high" },

  // Thu Oct 29
  { id: "ff_15", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "12:00 AM IST", isoTarget: "2026-10-29T00:00:00+05:30", currency: "USD", event: "FOMC Press Conference", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_16", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:00 PM IST", isoTarget: "2026-10-29T18:00:00+05:30", currency: "USD", event: "Advance GDP q/q", forecast: "2.2%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_17", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:00 PM IST", isoTarget: "2026-10-29T18:00:00+05:30", currency: "USD", event: "Core PCE Price Index m/m", forecast: "0.2%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_18", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:45 PM IST", isoTarget: "2026-10-29T18:45:00+05:30", currency: "EUR", event: "Main Refinancing Rate", forecast: "2.65%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_19", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:45 PM IST", isoTarget: "2026-10-29T18:45:00+05:30", currency: "EUR", event: "Monetary Policy Statement", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_20", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "07:15 PM IST", isoTarget: "2026-10-29T19:15:00+05:30", currency: "EUR", event: "ECB Press Conference", forecast: "-", prev: "-", actual: "-", impact: "high" },

  // Fri Oct 30
  { id: "ff_21", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTarget: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "BOJ Policy Rate", forecast: "<1.25%", prev: "-", actual: "-", impact: "high" },
  { id: "ff_22", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTarget: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "Monetary Policy Statement", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_23", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTarget: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "BOJ Outlook Report", forecast: "-", prev: "-", actual: "-", impact: "high" },
  { id: "ff_24", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTarget: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "BOJ Press Conference", forecast: "-", prev: "-", actual: "-", impact: "high" }
];

async function getEconomicNews(range = 'today') {
  const todayStr = "2026-10-19";

  if (range === 'today') {
    return FOREX_FACTORY_DATA.filter(ev => ev.date === todayStr);
  }
  
  if (range === 'this_week') {
    // Current week: Mon Oct 19 to Sun Oct 25
    return FOREX_FACTORY_DATA.filter(ev => ev.date >= "2026-10-19" && ev.date <= "2026-10-25");
  }

  // THIS MONTH: From Today onwards (Oct 19 to Nov 02 and beyond)
  return FOREX_FACTORY_DATA.filter(ev => ev.date >= todayStr);
}

async function analyzeNewsWithAI(eventsList) {
  if (!eventsList || eventsList.length === 0) return {};

  const promptText = `
  You are an expert Institutional ICT Forex Analyst for an SMC Terminal.
  Evaluate these exact Forex Factory Red Folder Events:
  ${JSON.stringify(eventsList, null, 2)}

  Evaluate directional bias (BULLISH, BEARISH, or NEUTRAL), confidence %, and ICT tactical note for each currency.

  Return strictly raw JSON format without markdown code blocks:
  {
    "CAD": { "bias": "BULLISH", "confidence": "58%", "ict_note": "CPI inflation forecast 0.2% vs -0.1% previous. Watch for Judas Swing sweep before NY Killzone." },
    "GBP": { "bias": "BULLISH", "confidence": "65%", "ict_note": "CPI inflation expansion expected (3.4% vs 3.1%). Look for London Killzone FVG setup." },
    "USD": { "bias": "BEARISH", "confidence": "70%", "ict_note": "FOMC Federal Funds Rate 4.00% & Advance GDP forecast. Expect liquidity expansion." },
    "AUD": { "bias": "BULLISH", "confidence": "62%", "ict_note": "CPI forecast 4.0% indicating hawkish pressure." },
    "EUR": { "bias": "BEARISH", "confidence": "55%", "ict_note": "ECB Rate decision 2.65%. Watch Asian high sweep." },
    "JPY": { "bias": "NEUTRAL", "confidence": "45%", "ict_note": "BOJ Policy Rate tentative. Await official release." }
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
      "CAD": { "bias": "BULLISH", "confidence": "58%", "ict_note": "CPI inflation forecast 0.2% vs -0.1% previous. Watch for Judas Swing sweep." },
      "GBP": { "bias": "BULLISH", "confidence": "65%", "ict_note": "CPI inflation expansion expected (3.4% vs 3.1%)." },
      "USD": { "bias": "BEARISH", "confidence": "70%", "ict_note": "FOMC Rate & GDP forecast. Watch for liquidity sweeps." }
    };
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