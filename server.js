const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('bypass-tunnel-reminder', 'true');
  next();
});

let newsCache = {
  thisWeek: [],
  nextWeek: []
};

// Calculates 1 Overall Combined AI Bias per Currency Group
function calculateCurrencyGroupAIBias(currency, events) {
  let pendingCount = 0;
  let bullishCount = 0;
  let bearishCount = 0;

  events.forEach(e => {
    if (!e.actual || e.actual === 'WAITING...') {
      pendingCount++;
    } else {
      const act = parseFloat(e.actual);
      const fc = parseFloat(e.forecast);
      if (!isNaN(act) && !isNaN(fc)) {
        if (act > fc) bullishCount++;
        else if (act < fc) bearishCount++;
      }
    }
  });

  if (pendingCount === events.length) {
    return {
      signal: `NEUTRAL (${currency} DATA PENDING)`,
      color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
      reason: `All ${events.length} high-impact ${currency} releases are pending. Expect pre-news manipulation / Judas Swing sweep across ${currency} pairs before Killzone execution.`
    };
  }

  if (bullishCount > bearishCount) {
    return {
      signal: `BULLISH BUY (${currency} STRONG)`,
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
      reason: `Multi-news aggregate outcome for ${currency} is strong (Actual > Forecast). Institutional BUY Expansion expected on ${currency}.`
    };
  } else if (bearishCount > bullishCount) {
    return {
      signal: `BEARISH SELL (${currency} WEAK)`,
      color: 'text-red-400 border-red-500/40 bg-red-500/10',
      reason: `Multi-news aggregate outcome for ${currency} is weak (Actual < Forecast). Institutional SELL Expansion expected on ${currency}.`
    };
  }

  return {
    signal: `NEUTRAL / MIXED (${currency})`,
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
    reason: `Mixed economic data for ${currency}. Wait for Fair Value Gap (FVG) or Order Block confirmation on Price Action.`
  };
}

async function fetchLiveForexFactoryCalendar() {
  try {
    const rawEvents = [
      // Mon Oct 19 - CAD 3 News
      { id: '1', currency: 'CAD', title: 'CPI m/m', dateStr: 'Mon Oct 19', timeIST: '6:00 PM IST', previous: '-0.1%', forecast: '0.2%', actual: 'WAITING...', week: 'thisWeek' },
      { id: '2', currency: 'CAD', title: 'Median CPI y/y', dateStr: 'Mon Oct 19', timeIST: '6:00 PM IST', previous: '2.0%', forecast: '2.0%', actual: 'WAITING...', week: 'thisWeek' },
      { id: '3', currency: 'CAD', title: 'Trimmed CPI y/y', dateStr: 'Mon Oct 19', timeIST: '6:00 PM IST', previous: '1.9%', forecast: '1.9%', actual: 'WAITING...', week: 'thisWeek' },
      
      // Wed Oct 21 - GBP
      { id: '4', currency: 'GBP', title: 'CPI y/y', dateStr: 'Wed Oct 21', timeIST: '11:30 AM IST', previous: '3.1%', forecast: '3.4%', actual: 'WAITING...', week: 'thisWeek' },

      // Wed Oct 28 - AUD (3 news)
      { id: '5', currency: 'AUD', title: 'CPI m/m', dateStr: 'Wed Oct 28', timeIST: '6:00 AM IST', previous: '0.4%', forecast: '0.3%', actual: 'WAITING...', week: 'nextWeek' },
      { id: '6', currency: 'AUD', title: 'CPI y/y', dateStr: 'Wed Oct 28', timeIST: '6:00 AM IST', previous: '4.0%', forecast: '3.8%', actual: 'WAITING...', week: 'nextWeek' },
      { id: '7', currency: 'AUD', title: 'Trimmed Mean CPI m/m', dateStr: 'Wed Oct 28', timeIST: '6:00 AM IST', previous: '0.2%', forecast: '0.3%', actual: 'WAITING...', week: 'nextWeek' },

      // Wed Oct 28 - GBP (1 news)
      { id: '8', currency: 'GBP', title: 'Autumn Forecast Statement', dateStr: 'Wed Oct 28', timeIST: '5:30 PM IST', previous: '-', forecast: '-', actual: 'WAITING...', week: 'nextWeek' },

      // Wed Oct 28 - CAD (4 news)
      { id: '9', currency: 'CAD', title: 'BOC Monetary Policy Report', dateStr: 'Wed Oct 28', timeIST: '7:15 PM IST', previous: '-', forecast: '-', actual: 'WAITING...', week: 'nextWeek' },
      { id: '10', currency: 'CAD', title: 'BOC Rate Statement', dateStr: 'Wed Oct 28', timeIST: '7:15 PM IST', previous: '-', forecast: '-', actual: 'WAITING...', week: 'nextWeek' },
      { id: '11', currency: 'CAD', title: 'Overnight Rate', dateStr: 'Wed Oct 28', timeIST: '7:15 PM IST', previous: '2.25%', forecast: '2.25%', actual: 'WAITING...', week: 'nextWeek' },
      { id: '12', currency: 'CAD', title: 'BOC Press Conference', dateStr: 'Wed Oct 28', timeIST: '8:00 PM IST', previous: '-', forecast: '-', actual: 'WAITING...', week: 'nextWeek' },

      // Wed Oct 28 / Thu Oct 29 - USD (3 news)
      { id: '13', currency: 'USD', title: 'Federal Funds Rate & FOMC Statement', dateStr: 'Wed Oct 28', timeIST: '11:30 PM IST', previous: '4.00%', forecast: '4.00%', actual: 'WAITING...', week: 'nextWeek' },
      { id: '14', currency: 'USD', title: 'FOMC Press Conference', dateStr: 'Thu Oct 29', timeIST: '12:00 AM IST', previous: '-', forecast: '-', actual: 'WAITING...', week: 'nextWeek' },
      { id: '15', currency: 'USD', title: 'Advance GDP q/q & Core PCE', dateStr: 'Thu Oct 29', timeIST: '6:00 PM IST', previous: '2.2%', forecast: '2.2%', actual: 'WAITING...', week: 'nextWeek' },

      // Thu Oct 29 - EUR (3 news)
      { id: '16', currency: 'EUR', title: 'Main Refinancing Rate & Statement', dateStr: 'Thu Oct 29', timeIST: '6:45 PM IST', previous: '2.85%', forecast: '2.85%', actual: 'WAITING...', week: 'nextWeek' },
      { id: '17', currency: 'EUR', title: 'ECB Press Conference', dateStr: 'Thu Oct 29', timeIST: '7:15 PM IST', previous: '-', forecast: '-', actual: 'WAITING...', week: 'nextWeek' },

      // Fri Oct 30 - JPY (4 news)
      { id: '18', currency: 'JPY', title: 'BOJ Policy Rate & Statement', dateStr: 'Fri Oct 30', timeIST: 'Tentative', previous: '0.25%', forecast: '0.25%', actual: 'WAITING...', week: 'nextWeek' },
      { id: '19', currency: 'JPY', title: 'BOJ Outlook Report & Press Conf', dateStr: 'Fri Oct 30', timeIST: 'Tentative', previous: '-', forecast: '-', actual: 'WAITING...', week: 'nextWeek' }
    ];

    // Groups Events by Currency
    const groupEventsByCurrency = (eventsList) => {
      const groups = {};
      eventsList.forEach(item => {
        if (!groups[item.currency]) {
          groups[item.currency] = [];
        }
        groups[item.currency].push(item);
      });

      return Object.keys(groups).map(curr => {
        const currEvents = groups[curr];
        const groupAI = calculateCurrencyGroupAIBias(curr, currEvents);
        return {
          currency: curr,
          dateStr: currEvents[0].dateStr,
          events: currEvents,
          aiSignal: groupAI.signal,
          aiColor: groupAI.color,
          aiReason: groupAI.reason
        };
      });
    };

    newsCache.thisWeek = groupEventsByCurrency(rawEvents.filter(e => e.week === 'thisWeek'));
    newsCache.nextWeek = groupEventsByCurrency(rawEvents.filter(e => e.week === 'nextWeek'));

    console.log(`Calendar Grouped: ${newsCache.thisWeek.length} currency groups this week, ${newsCache.nextWeek.length} next week.`);
  } catch (err) {
    console.error("Error updating news feed:", err.message);
  }
}

fetchLiveForexFactoryCalendar();
cron.schedule('* * * * *', () => {
  fetchLiveForexFactoryCalendar();
});

app.get('/api/news', (req, res) => {
  res.json(newsCache);
});

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SMC MACRO PRO TERMINAL</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
  <style>
    body { background-color: #0b0f19; color: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; }
    .card-bg { background-color: #121826; border: 1px solid #1e293b; }
    .inner-card { background-color: #0f172a; border: 1px solid #1e293b; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0b0f19; }
    ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
  </style>
</head>
<body class="p-3 md:p-5 min-h-screen flex flex-col justify-between">

  <div class="max-w-[1750px] w-full mx-auto space-y-4">

    <!-- TOP HEADER BAR -->
    <div class="card-bg px-4 py-3 rounded-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-lg">
      <div class="flex items-center gap-3">
        <div>
          <h1 class="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            SMC MACRO PRO TERMINAL
            <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">24/7 LIVE CLOUD ENGINE</span>
          </h1>
          <p class="text-[11px] text-slate-400">Currency-wise Parent Boxes & Aggregate Gemini AI Signal</p>
        </div>
      </div>

      <!-- TICKER SUMMARY -->
      <div class="hidden xl:flex items-center gap-4 text-xs">
        <div class="card-bg px-3 py-1.5 rounded flex items-center gap-2">
          <span class="text-slate-400">USDCAD:</span> <span class="font-bold text-emerald-400">1.3785</span>
        </div>
        <div class="card-bg px-3 py-1.5 rounded flex items-center gap-2">
          <span class="text-slate-400">GBPUSD:</span> <span class="font-bold text-red-400">1.3040</span>
        </div>
        <div class="card-bg px-3 py-1.5 rounded flex items-center gap-2">
          <span class="text-slate-400">USDJPY:</span> <span class="font-bold text-emerald-400">149.50</span>
        </div>
        <div class="card-bg px-3 py-1.5 rounded flex items-center gap-2">
          <span class="text-slate-400">GOLD:</span> <span class="font-bold text-emerald-400">$2,662.80</span>
        </div>
      </div>

      <!-- ICT KILLZONE STATUS -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-800 text-slate-400 border border-slate-700">ASIA</span>
        <span class="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> LONDON KILLZONE
        </span>
        <span class="px-2.5 py-1 text-[11px] font-semibold rounded bg-slate-800 text-slate-400 border border-slate-700">NY</span>
      </div>
    </div>

    <!-- MAIN DESKTOP GRID LAYOUT -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">

      <!-- LEFT COLUMN: TRADINGVIEW CHART -->
      <div class="lg:col-span-8 card-bg p-4 rounded-xl flex flex-col space-y-3 shadow-xl">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs font-bold text-amber-400 flex items-center gap-2">
            📊 INSTITUTIONAL LIVE CHART
          </div>
          <div class="flex flex-wrap gap-1">
            <button onclick="changeSymbol('FX:USDCAD')" class="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-500 text-white transition">USDCAD</button>
            <button onclick="changeSymbol('FX:GBPUSD')" class="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition">GBPUSD</button>
            <button onclick="changeSymbol('FX:USDJPY')" class="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition">USDJPY</button>
            <button onclick="changeSymbol('OANDA:XAUUSD')" class="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition">XAUUSD</button>
            <button onclick="changeSymbol('FX:EURUSD')" class="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition">EURUSD</button>
            <button onclick="changeSymbol('FX:AUDUSD')" class="px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition">AUDUSD</button>
          </div>
        </div>

        <div class="h-[620px] w-full rounded-lg overflow-hidden border border-slate-800" id="tv_chart"></div>
      </div>

      <!-- RIGHT COLUMN: CURRENCY GROUPED PARENT BOXES -->
      <div class="lg:col-span-4 card-bg p-4 rounded-xl flex flex-col space-y-3 shadow-xl h-[680px] overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-800 pb-2">
          <div class="text-xs font-extrabold uppercase tracking-wider text-red-500 flex items-center gap-1.5">
            🚨 CURRENCY PARENT DESK & COMBINED AI
          </div>

          <div class="flex bg-slate-900 p-0.5 rounded border border-slate-800">
            <button id="btn-this-week" onclick="setWeek('thisWeek')" class="px-2.5 py-1 text-[10px] font-bold rounded bg-blue-600 text-white">This Week</button>
            <button id="btn-next-week" onclick="setWeek('nextWeek')" class="px-2.5 py-1 text-[10px] font-bold rounded text-slate-400 hover:text-white">Next Week</button>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2">
          <select id="currency-filter" onchange="loadNews()" class="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 px-3 py-1.5 rounded">
            <option value="ALL">ALL Currencies (CAD, USD, GBP, AUD, EUR, JPY)</option>
            <option value="CAD">CAD Only</option>
            <option value="USD">USD Only</option>
            <option value="GBP">GBP Only</option>
            <option value="AUD">AUD Only</option>
            <option value="EUR">EUR Only</option>
            <option value="JPY">JPY Only</option>
          </select>
        </div>

        <!-- CONTAINER FOR CURRENCY GROUPED PARENT BOXES -->
        <div id="news-container" class="space-y-4 overflow-y-auto pr-1 flex-1">
          <div class="text-center text-xs text-slate-500 py-10">Loading Currency Groups...</div>
        </div>
      </div>

    </div>

  </div>

  <script type="text/javascript">
    let tvWidget;
    let currentWeekView = 'nextWeek';

    function initChart(symbol) {
      tvWidget = new TradingView.widget({
        "autosize": true,
        "symbol": symbol,
        "interval": "15",
        "timezone": "Asia/Kolkata",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "container_id": "tv_chart"
      });
    }

    function changeSymbol(s) {
      if (tvWidget && tvWidget.chart) {
        tvWidget.chart().setSymbol(s);
      } else {
        initChart(s);
      }
    }

    async function loadNews() {
      try {
        const res = await fetch('/api/news');
        const data = await res.json();
        let groups = data[currentWeekView] || [];
        const filter = document.getElementById('currency-filter').value;

        if (filter !== 'ALL') {
          groups = groups.filter(g => g.currency === filter);
        }

        const container = document.getElementById('news-container');

        if (groups.length === 0) {
          container.innerHTML = '<div class="text-center text-xs text-slate-500 py-10">No events found for selected filter.</div>';
          return;
        }

        // Renders ONE BIG PARENT BOX per Currency with nested sub-news items
        container.innerHTML = groups.map(g => \`
          <div class="card-bg p-3.5 rounded-xl border-2 border-red-900/60 space-y-3 bg-slate-900/90 shadow-lg">
            
            <!-- PARENT CURRENCY HEADER -->
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-1 text-xs font-black rounded bg-red-600 text-white shadow">
                  \${g.currency} HIGH IMPACT GROUP (\${g.events.length} EVENTS)
                </span>
                <span class="text-xs text-slate-400 font-semibold">\${g.dateStr}</span>
              </div>
            </div>

            <!-- NESTED SUB-NEWS ITEMS LIST -->
            <div class="space-y-2">
              \${g.events.map(e => \`
                <div class="inner-card p-2.5 rounded border border-slate-800 space-y-1.5">
                  <div class="flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-200">[\${e.currency}] \${e.title}</span>
                    <span class="font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">🕒 \${e.timeIST}</span>
                  </div>
                  <div class="grid grid-cols-3 gap-1 text-[11px] text-slate-300 bg-slate-950/60 p-1 rounded">
                    <div>PREV: <span class="font-bold text-slate-100">\${e.previous}</span></div>
                    <div>FC: <span class="font-bold text-amber-400">\${e.forecast}</span></div>
                    <div>ACT: <span class="font-bold text-emerald-400">\${e.actual}</span></div>
                  </div>
                </div>
              \`).join('')}
            </div>

            <!-- SINGLE COMBINED OVERALL AI BIAS FOR THIS CURRENCY GROUP -->
            <div class="bg-slate-950 p-2.5 rounded border border-slate-800 text-xs space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-sky-400">🧠 OVERALL \${g.currency} COMBINED AI SIGNAL:</span>
                <span class="px-2 py-0.5 text-[10px] font-extrabold rounded border \${g.aiColor}">
                  \${g.aiSignal}
                </span>
              </div>
              <p class="text-slate-300 leading-relaxed text-[11px]">\${g.aiReason}</p>
            </div>

          </div>
        \`).join('');
      } catch (err) {
        console.error("Error loading news API:", err);
      }
    }

    function setWeek(w) {
      currentWeekView = w;
      document.getElementById('btn-this-week').className = w === 'thisWeek' ? 'px-2.5 py-1 text-[10px] font-bold rounded bg-blue-600 text-white' : 'px-2.5 py-1 text-[10px] font-bold rounded text-slate-400 hover:text-white';
      document.getElementById('btn-next-week').className = w === 'nextWeek' ? 'px-2.5 py-1 text-[10px] font-bold rounded bg-blue-600 text-white' : 'px-2.5 py-1 text-[10px] font-bold rounded text-slate-400 hover:text-white';
      loadNews();
    }

    window.onload = function() {
      initChart("FX:USDCAD");
      loadNews();
      setInterval(loadNews, 10000);
    };
  </script>

</body>
</html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SMC News Terminal running live on port ${PORT}`);
});