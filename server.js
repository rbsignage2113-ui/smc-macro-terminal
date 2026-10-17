const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SMC Macro Pro Terminal</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #0b0f17; color: #c9d1d9; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        .glow-green { box-shadow: 0 0 20px rgba(34, 197, 94, 0.15); }
        .glass-card { background: rgba(22, 27, 34, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    </style>
</head>
<body class="min-h-screen p-3 sm:p-5 md:p-6">
    <!-- Header with Live Date & Killzone Clock -->
    <header class="max-w-7xl mx-auto glass-card rounded-2xl p-4 mb-5 border-slate-800 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
            <div class="flex items-center gap-2.5">
                <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                <h1 class="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-white mono">SMC MACRO <span class="text-emerald-400">TERMINAL</span></h1>
            </div>
            <span id="live-date-header" class="text-xs sm:text-sm font-semibold text-slate-300 mono bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg">--</span>
        </div>
        
        <!-- Live Clocks -->
        <div class="w-full lg:w-auto flex flex-wrap justify-between sm:justify-center gap-3 text-xs mono bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div><span class="text-slate-500">LONDON:</span> <span id="clock-london" class="text-emerald-400 font-bold">00:00</span></div>
            <div class="text-slate-700">|</div>
            <div><span class="text-slate-500">NEW YORK:</span> <span id="clock-ny" class="text-blue-400 font-bold">00:00</span></div>
            <div class="text-slate-700">|</div>
            <div><span class="text-slate-500">ASIAN:</span> <span id="clock-asia" class="text-amber-400 font-bold">00:00</span></div>
        </div>
    </header>

    <!-- AI Bias Summary Dashboard -->
    <main class="max-w-7xl mx-auto space-y-5">
        <section class="glass-card rounded-2xl p-4 sm:p-5 border-emerald-500/20 glow-green">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 class="text-xs sm:text-sm font-bold tracking-wider text-emerald-400 uppercase mono flex items-center gap-2">
                    ⚡ AI SMC Macro Sentiment Analysis
                </h2>
                <span id="last-updated-tag" class="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full font-medium">Live Stream Active</span>
            </div>
            <div id="ai-summary" class="text-xs sm:text-sm leading-relaxed text-slate-300">
                Calculating Macro Bias using Live Date, Time, Forecast vs Previous vs Actual economic data...
            </div>
        </section>

        <!-- News Events Grid -->
        <section class="glass-card rounded-2xl p-4 sm:p-5 border-slate-800">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm sm:text-base font-semibold text-white mono">Economic Releases & Drivers</h3>
                <span class="text-[11px] text-slate-400 mono">Auto Sync: 30s</span>
            </div>

            <div id="news-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="text-slate-500 col-span-full text-center py-8 mono text-xs">Fetching Realtime Economic Calendar Data...</div>
            </div>
        </section>
    </main>

    <script>
        // Update Live Clocks & Date
        function updateClocks() {
            const now = new Date();
            
            // Header Live Date & Local Time
            const dateOptions = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
            const formattedDate = now.toLocaleDateString('en-US', dateOptions);
            const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
            const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
            document.getElementById('live-date-header').innerText = \`\${formattedDate} • \${formattedTime}\`;

            // Sessions Timezone Clocks
            const formatTime = (timeZone) => new Intl.DateTimeFormat('en-GB', {
                timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            }).format(now);

            document.getElementById('clock-london').innerText = formatTime('Europe/London');
            document.getElementById('clock-ny').innerText = formatTime('America/New_York');
            document.getElementById('clock-asia').innerText = formatTime('Asia/Tokyo');
        }
        setInterval(updateClocks, 1000);
        updateClocks();

        // High Impact Sound Alert
        function playAlertSound() {
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                osc.start();
                osc.stop(ctx.currentTime + 0.25);
            } catch(e) {}
        }

        // Fetch Economic Data
        async function loadMacroTerminal() {
            try {
                const response = await fetch('https://nickerio.github.io/forex-factory-calendar/data/thisWeek.json');
                const data = await response.json();
                
                const container = document.getElementById('news-container');
                container.innerHTML = '';

                let usdBullishPoints = 0;
                let usdBearishPoints = 0;
                let hasHighImpact = false;

                data.slice(0, 21).forEach(item => {
                    const impactColor = item.impact === 'High' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 
                                       item.impact === 'Medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                                       'bg-slate-800 text-slate-400 border-slate-700';

                    if (item.impact === 'High') hasHighImpact = true;

                    // Calculate Sentiment Logic
                    if (item.country === 'USD' && item.actual) {
                        const act = parseFloat(item.actual);
                        const fc = parseFloat(item.forecast);
                        if (!isNaN(act) && !isNaN(fc)) {
                            if (act > fc) usdBullishPoints++;
                            if (act < fc) usdBearishPoints++;
                        }
                    }

                    const eventTimeDisplay = (item.date ? item.date + ' ' : '') + (item.time || 'All Day');

                    const card = document.createElement('div');
                    card.className = 'glass-card p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition duration-200 flex flex-col justify-between';
                    card.innerHTML = \`
                        <div>
                            <div class="flex justify-between items-center mb-2">
                                <span class="font-bold text-[10px] sm:text-xs px-2 py-0.5 rounded border \${impactColor}">\${item.impact || 'Low'} Impact</span>
                                <span class="mono text-xs font-bold text-slate-300">\${item.country || 'USD'}</span>
                            </div>
                            
                            <div class="text-[11px] mono text-emerald-400/90 font-medium mb-1 flex items-center gap-1">
                                📅 \${eventTimeDisplay}
                            </div>

                            <h4 class="font-semibold text-slate-100 text-xs sm:text-sm mb-3 line-clamp-2">\${item.title}</h4>
                        </div>
                        
                        <div class="bg-slate-950/90 rounded-lg p-2.5 text-xs grid grid-cols-3 gap-1 text-center mono border border-slate-800/80">
                            <div>
                                <span class="text-slate-500 text-[9px] block">ACTUAL</span>
                                <span class="\${item.actual ? 'text-emerald-400 font-bold' : 'text-slate-400'}">\${item.actual || '--'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[9px] block">FORECAST</span>
                                <span class="text-slate-300 font-medium">\${item.forecast || '--'}</span>
                            </div>
                            <div>
                                <span class="text-slate-500 text-[9px] block">PREVIOUS</span>
                                <span class="text-slate-400 font-medium">\${item.previous || '--'}</span>
                            </div>
                        </div>
                    \`;
                    container.appendChild(card);
                });

                // Update AI Sentiment Text
                const summaryBox = document.getElementById('ai-summary');
                let sentimentText = '';
                if (usdBullishPoints > usdBearishPoints) {
                    sentimentText = \`<strong class="text-emerald-400">USD BULLISH MACRO BIAS:</strong> Actual metrics outperformed forecasts. High probability for USD strength during New York Session. Look for SMT Divergence & FVGs for Dollar Longs / EURUSD Shorts.\`;
                } else if (usdBearishPoints > usdBullishPoints) {
                    sentimentText = \`<strong class="text-red-400">USD BEARISH MACRO BIAS:</strong> Economic releases underperformed forecasts. High probability for USD liquidity sweep lower. Look for premium FVGs to Short USD / Long Gold & EURUSD.\`;
                } else {
                    sentimentText = \`<strong class="text-amber-400">NEUTRAL / CONSOLIDATION BIAS:</strong> Data is currently balanced or pending releases. SMC Orderflow recommends waiting for High-Impact Liquidity Sweeps at Asian/London Highs & Lows.\`;
                }
                summaryBox.innerHTML = sentimentText;

                document.getElementById('last-updated-tag').innerText = 'Synced: ' + new Date().toLocaleTimeString();

            } catch (err) {
                console.error(err);
            }
        }

        window.onload = loadMacroTerminal;
        setInterval(loadMacroTerminal, 30000);
    </script>
</body>
</html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMC Pro Terminal live on port ${PORT}`);
});