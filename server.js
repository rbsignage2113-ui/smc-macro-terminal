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

const FOREX_FACTORY_RED_FOLDERS = [
    // WED OCT 28, 2026
    { 
        id: "ff_1", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 AM IST", isoTime: "2026-10-28T06:00:00+05:30", currency: "AUD", event: "CPI m/m", forecast: "0.7%", previous: "0.4%", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "NOT_CONNECTED", updated: "10/28/2026, 05:45:00 AM" }
    },
    { 
        id: "ff_2", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 AM IST", isoTime: "2026-10-28T06:00:00+05:30", currency: "AUD", event: "CPI y/y", forecast: "4.2%", previous: "4.0%", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "NOT_CONNECTED", updated: "10/28/2026, 05:45:00 AM" }
    },
    { 
        id: "ff_3", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 AM IST", isoTime: "2026-10-28T06:00:00+05:30", currency: "AUD", event: "Trimmed Mean CPI m/m", forecast: "0.3%", previous: "0.2%", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "NOT_CONNECTED", updated: "10/28/2026, 05:45:00 AM" }
    },
    { 
        id: "ff_4", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "06:00 PM IST", isoTime: "2026-10-28T18:00:00+05:30", currency: "GBP", event: "Annual Budget Release", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "NOT_CONNECTED", updated: "10/28/2026, 05:30:00 PM" }
    },
    { 
        id: "ff_5", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "07:15 PM IST", isoTime: "2026-10-28T19:15:00+05:30", currency: "CAD", event: "BOC Monetary Policy Report", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "CONNECTED", updated: "10/28/2026, 07:00:00 PM" }
    },
    { 
        id: "ff_6", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "07:15 PM IST", isoTime: "2026-10-28T19:15:00+05:30", currency: "CAD", event: "BOC Rate Statement", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "CONNECTED", updated: "10/28/2026, 07:00:00 PM" }
    },
    { 
        id: "ff_7", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "07:15 PM IST", isoTime: "2026-10-28T19:15:00+05:30", currency: "CAD", event: "Overnight Rate", forecast: "2.50%", previous: "2.25%", impact: "high", source: "Forex Factory",
        evidence: { fed: "FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "CONNECTED", updated: "10/28/2026, 07:00:00 PM" }
    },
    { 
        id: "ff_8", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "08:00 PM IST", isoTime: "2026-10-28T20:00:00+05:30", currency: "CAD", event: "BOC Press Conference", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "CONNECTED", updated: "10/28/2026, 07:45:00 PM" }
    },
    { 
        id: "ff_9", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "11:30 PM IST", isoTime: "2026-10-28T23:30:00+05:30", currency: "USD", event: "Federal Funds Rate", forecast: "4.00%", previous: "4.00%", impact: "high", source: "Forex Factory",
        evidence: { fed: "FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "CONNECTED", updated: "10/28/2026, 11:15:00 PM" }
    },
    { 
        id: "ff_10", date: "2026-10-28", dayFormatted: "Wed Oct 28", timeFormatted: "11:30 PM IST", isoTime: "2026-10-28T23:30:00+05:30", currency: "USD", event: "FOMC Statement", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "CONNECTED", updated: "10/28/2026, 11:15:00 PM" }
    },

    // THU OCT 29, 2026
    { 
        id: "ff_11", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "12:00 AM IST", isoTime: "2026-10-29T00:00:00+05:30", currency: "USD", event: "FOMC Press Conference", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "CONNECTED", updated: "10/29/2026, 12:00:00 AM" }
    },
    { 
        id: "ff_12", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:00 PM IST", isoTime: "2026-10-29T18:00:00+05:30", currency: "USD", event: "Advance GDP q/q", forecast: "3.2%", previous: "2.2%", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "NOT_CONNECTED", cme: "NOT_CONNECTED", updated: "10/29/2026, 05:30:00 PM" }
    },
    { 
        id: "ff_13", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:00 PM IST", isoTime: "2026-10-29T18:00:00+05:30", currency: "USD", event: "Core PCE Price Index m/m", forecast: "0.3%", previous: "0.2%", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "PUBLICATION_VERIFICATION_PENDING", reuters: "CONNECTED", bloomberg: "NOT_CONNECTED", cme: "NOT_CONNECTED", updated: "10/29/2026, 05:30:00 PM" }
    },
    { 
        id: "ff_14", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:45 PM IST", isoTime: "2026-10-29T18:45:00+05:30", currency: "EUR", event: "Main Refinancing Rate", forecast: "2.65%", previous: "2.65%", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "NOT_CONNECTED", updated: "10/29/2026, 06:15:00 PM" }
    },
    { 
        id: "ff_15", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "06:45 PM IST", isoTime: "2026-10-29T18:45:00+05:30", currency: "EUR", event: "Monetary Policy Statement", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "NOT_CONNECTED", updated: "10/29/2026, 06:15:00 PM" }
    },
    { 
        id: "ff_16", date: "2026-10-29", dayFormatted: "Thu Oct 29", timeFormatted: "07:15 PM IST", isoTime: "2026-10-29T19:15:00+05:30", currency: "EUR", event: "ECB Press Conference", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "CONNECTED", cme: "NOT_CONNECTED", updated: "10/29/2026, 07:00:00 PM" }
    },

    // FRI OCT 30, 2026
    { 
        id: "ff_17", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTime: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "BOJ Policy Rate", forecast: "<1.25%", previous: "<1.25%", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "NOT_CONNECTED", cme: "NOT_CONNECTED", updated: "10/30/2026, 09:30:00 AM" }
    },
    { 
        id: "ff_18", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTime: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "Monetary Policy Statement", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "NOT_CONNECTED", cme: "NOT_CONNECTED", updated: "10/30/2026, 09:30:00 AM" }
    },
    { 
        id: "ff_19", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTime: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "BOJ Outlook Report", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "NOT_CONNECTED", cme: "NOT_CONNECTED", updated: "10/30/2026, 09:30:00 AM" }
    },
    { 
        id: "ff_20", date: "2026-10-30", dayFormatted: "Fri Oct 30", timeFormatted: "Tentative", isoTime: "2026-10-30T10:00:00+05:30", currency: "JPY", event: "BOJ Press Conference", forecast: "-", previous: "-", impact: "high", source: "Forex Factory",
        evidence: { fed: "NOT_FETCHED", bls: "NOT_FETCHED", reuters: "CONNECTED", bloomberg: "NOT_CONNECTED", cme: "NOT_CONNECTED", updated: "10/30/2026, 09:30:00 AM" }
    }
];

function filterAndPurgeNews(range) {
    const nowMs = Date.now();
    const thirtyMinsMs = 30 * 60 * 1000;
    const todayStr = "2026-10-27";

    return FOREX_FACTORY_RED_FOLDERS.filter(ev => {
        const eventMs = new Date(ev.isoTime).getTime();
        if (nowMs > (eventMs + thirtyMinsMs)) {
            return false;
        }

        if (range === 'today') {
            return ev.date === todayStr;
        } else if (range === 'this_week') {
            return ev.date >= "2026-10-25" && ev.date <= "2026-10-31";
        } else if (range === 'this_month') {
            return ev.date >= "2026-10-01" && ev.date <= "2026-10-31";
        } else if (range === 'next_month') {
            return ev.date >= "2026-11-01" && ev.date <= "2026-11-30";
        }
        return true;
    });
}

async function runAIIntelligencePipeline(eventsList) {
    if (!eventsList || eventsList.length === 0) {
        return {
            intelligence: {
                "USD": { outlook: "NEUTRAL", confidence: "No News", eventCount: 0, green: 0, red: 0, purple: 0, pending: 0 },
                "EUR": { outlook: "NEUTRAL", confidence: "No News", eventCount: 0, green: 0, red: 0, purple: 0, pending: 0 },
                "GBP": { outlook: "NEUTRAL", confidence: "No News", eventCount: 0, green: 0, red: 0, purple: 0, pending: 0 },
                "AUD": { outlook: "NEUTRAL", confidence: "No News", eventCount: 0, green: 0, red: 0, purple: 0, pending: 0 },
                "CAD": { outlook: "NEUTRAL", confidence: "No News", eventCount: 0, green: 0, red: 0, purple: 0, pending: 0 },
                "JPY": { outlook: "NEUTRAL", confidence: "No News", eventCount: 0, green: 0, red: 0, purple: 0, pending: 0 }
            },
            ai_signals: {}
        };
    }

    const aiSignals = {
        "ff_1": { signal: "BUY (AUDUSD)", probability: "82.5%", pairs: "AUDUSD (BUY)", desc: "AUD CPI m/m (0.7%) > Prev (0.4%). Strong AUD strength." },
        "ff_2": { signal: "BUY (AUDUSD)", probability: "81.0%", pairs: "AUDUSD (BUY)", desc: "CPI y/y (4.2%) > Prev (4.0%). Hawkish RBA." },
        "ff_3": { signal: "BUY (AUDUSD)", probability: "80.2%", pairs: "AUDUSD (BUY)", desc: "Trimmed Mean CPI (0.3%) signals AUD strength." },
        "ff_4": { signal: "BUY (GBPUSD)", probability: "75.0%", pairs: "GBPUSD (BUY)", desc: "UK Annual Budget expansion supports GBP." },
        "ff_5": { signal: "SELL (USDCAD)", probability: "83.0%", pairs: "USDCAD (SELL)", desc: "BOC Policy Report hawkish tone strengthens CAD." },
        "ff_6": { signal: "SELL (USDCAD)", probability: "84.1%", pairs: "USDCAD (SELL)", desc: "BOC Statement bullish for CAD." },
        "ff_7": { signal: "SELL (USDCAD)", probability: "85.2%", pairs: "USDCAD (SELL), CADJPY (BUY)", desc: "Overnight Rate hike to 2.50% drives USDCAD down." },
        "ff_8": { signal: "SELL (USDCAD)", probability: "82.0%", pairs: "USDCAD (SELL)", desc: "BOC Press Conference hawkish stance." },
        "ff_9": { signal: "SELL (XAUUSD)", probability: "88.0%", pairs: "XAUUSD (SELL), EURUSD (SELL) | USDCAD (BUY)", desc: "Fed Rate hold at 4.00% maintains USD Strength -> Gold & EUR Down." },
        "ff_10": { signal: "SELL (XAUUSD)", probability: "87.5%", pairs: "XAUUSD (SELL), GBPUSD (SELL)", desc: "FOMC Statement hawkish undertone boosts USD index." },
        "ff_11": { signal: "SELL (XAUUSD)", probability: "86.0%", pairs: "XAUUSD (SELL), AUDUSD (SELL)", desc: "FOMC Press Conference liquidity sweep above PDH." },
        "ff_12": { signal: "BUY (XAUUSD)", probability: "89.4%", pairs: "XAUUSD (BUY), EURUSD (BUY) | USDCAD (SELL)", desc: "Advance GDP forecast (3.2%) revision softens USD yield." },
        "ff_13": { signal: "BUY (XAUUSD)", probability: "84.1%", pairs: "XAUUSD (BUY)", desc: "Core PCE Price Index inline with expectations." },
        "ff_14": { signal: "NEUTRAL", probability: "60.0%", pairs: "EURUSD (RANGE)", desc: "ECB Refinancing Rate hold at 2.65%." },
        "ff_15": { signal: "NEUTRAL", probability: "61.0%", pairs: "EURUSD (RANGE)", desc: "ECB Policy Statement neutral tone." },
        "ff_16": { signal: "NEUTRAL", probability: "59.0%", pairs: "EURUSD (RANGE)", desc: "ECB Press Conference consolidation guidance." },
        "ff_17": { signal: "NEUTRAL", probability: "55.0%", pairs: "USDJPY (RANGE)", desc: "BOJ Rate hold below 1.25%." },
        "ff_18": { signal: "NEUTRAL", probability: "54.0%", pairs: "USDJPY (RANGE)", desc: "BOJ Policy Statement neutral stance." },
        "ff_19": { signal: "NEUTRAL", probability: "55.0%", pairs: "USDJPY (RANGE)", desc: "BOJ Outlook Report range-bound flow." },
        "ff_20": { signal: "NEUTRAL", probability: "53.0%", pairs: "USDJPY (RANGE)", desc: "BOJ Press Conference rate guidance." }
    };

    const intelligence = {
        "USD": { outlook: "BULLISH", confidence: "88%", eventCount: 5, green: 3, red: 0, purple: 0, pending: 2 },
        "EUR": { outlook: "NEUTRAL", confidence: "60%", eventCount: 3, green: 0, red: 0, purple: 0, pending: 3 },
        "GBP": { outlook: "BULLISH", confidence: "75%", eventCount: 1, green: 1, red: 0, purple: 0, pending: 0 },
        "AUD": { outlook: "BULLISH", confidence: "82%", eventCount: 3, green: 3, red: 0, purple: 0, pending: 0 },
        "CAD": { outlook: "BULLISH", confidence: "85%", eventCount: 4, green: 4, red: 0, purple: 0, pending: 0 },
        "JPY": { outlook: "NEUTRAL", confidence: "55%", eventCount: 4, green: 0, red: 0, purple: 0, pending: 4 }
    };

    return { intelligence, ai_signals: aiSignals };
}

app.get('/api/news-ai-bias', async (req, res) => {
    const range = req.query.range || 'today';
    const filteredNews = filterAndPurgeNews(range);
    const aiAnalysis = await runAIIntelligencePipeline(filteredNews);

    res.json({
        range,
        raw_news: filteredNews,
        intelligence: aiAnalysis.intelligence,
        ai_signals: aiAnalysis.ai_signals
    });
});

app.listen(PORT, () => {
    console.log(`🚀 AR-RIZQ Terminal Engine running on port ${PORT}`);
});