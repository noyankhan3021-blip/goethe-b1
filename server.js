const express = require("express");
const { chromium } = require("playwright");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.PORT || 3000);
const COUNTRIES = {
  pk: { name: "Pakistan", url: "https://www.goethe.de/ins/pk/en/spr/prf/gzb1.cfm" },
  ae: { name: "UAE", url: "https://www.goethe.de/ins/ae/en/spr/prf/gzb1.cfm" },
  bd: { name: "Bangladesh", url: "https://www.goethe.de/ins/bd/en/spr/prf/gzb1.cfm" },
  om: { name: "Oman", url: "https://www.goethe.de/ins/om/en/spr/prf/gzb1.cfm" },
  tn: { name: "Tunisia", url: "https://www.goethe.de/ins/tn/en/spr/prf/gzb1.cfm" },
  ph: { name: "Philippines", url: "https://www.goethe.de/ins/ph/en/spr/prf/gzb1.cfm" },
  uz: { name: "Uzbekistan", url: "https://www.goethe.de/ins/uz/en/spr/prf/gzb1.cfm" },
  qa: { name: "Qatar", url: "https://www.goethe.de/ins/qa/en/spr/prf/gzb1.cfm" },
  sa: { name: "Saudi Arabia", url: "https://www.goethe.de/ins/sa/en/spr/prf/gzb1.cfm" },
  tr: { name: "Turkey", url: "https://www.goethe.de/ins/tr/en/spr/prf/gzb1.cfm" },
  th: { name: "Thailand", url: "https://www.goethe.de/ins/th/en/spr/prf/gzb1.cfm" },
  my: { name: "Malaysia", url: "https://www.goethe.de/ins/my/en/spr/prf/gzb1.cfm" },
  az: { name: "Azerbaijan", url: "https://www.goethe.de/ins/az/en/spr/prf/gzb1.cfm" },
  kz: { name: "Kazakhstan", url: "https://www.goethe.de/ins/kz/en/spr/prf/gzb1.cfm" },
  eg: { name: "Egypt", url: "https://www.goethe.de/ins/eg/en/spr/prf/gzb1.cfm" }
};

let browser, context, page;
let state = { running: false, busy: false, country: "pk", city: "Lahore", interval: 30,
  lastCheck: null, lastError: null, rows: [], logs: [], openCount: 0, scanMode: "single" };
let timer = null;
let previousOpen = new Set();

function log(message) {
  const item = { time: new Date().toISOString(), message };
  state.logs.unshift(item);
  state.logs = state.logs.slice(0, 150);
  console.log(`[${item.time}] ${message}`);
}
async function getPage() {
  if (page && !page.isClosed()) return page;
  if (!browser) browser = await chromium.launch({ headless: true });
  context = await browser.newContext();
  page = await context.newPage();
  page.setDefaultNavigationTimeout(45000);
  return page;
}
async function readCountry(code) {
  const country = COUNTRIES[code];
  if (!country) throw new Error("Unsupported country code: " + code);
  const p = await getPage();
  const responseUrls = new Set();
  const listener = req => {
    if (req.url().includes("/rest/examfinder")) responseUrls.add(req.url());
  };
  p.on("request", listener);
  try {
    await p.goto(country.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await p.waitForTimeout(4500);
    const urls = await p.evaluate(() =>
      [...new Set(performance.getEntriesByType("resource")
        .map(x => x.name).filter(x => x.includes("/rest/examfinder")))]
    );
    for (const u of urls) responseUrls.add(u);
    if (!responseUrls.size) throw new Error("Goethe exam list API was not exposed by the page. Open the official page manually and retry later.");
    const rows = await p.evaluate(async (urls) => {
      const all = await Promise.all(urls.map(async u => {
        try {
          const sep = u.includes("?") ? "&" : "?";
          const r = await fetch(u + sep + "_monitor=" + Date.now(), {
            credentials: "include", cache: "no-store",
            headers: { "X-Requested-With": "XMLHttpRequest", "Accept": "application/json, text/javascript, */*; q=0.01" }
          });
          if (!r.ok) return [];
          const j = await r.json();
          return Array.isArray(j.DATA) ? j.DATA : [];
        } catch (_) { return []; }
      }));
      return all.flat();
    }, [...responseUrls]);
    return rows.map(r => {
      const open = !!(r.oid && !(r.buttonDisabled && String(r.buttonDisabled).trim()));
      return {
        country: country.name,
        city: String(r.locationName || "Unknown"),
        date: String(r.eventTimeSpan || "").trim(),
        open,
        availability: r.availability ?? null,
        availabilityText: String(r.availabilityText || "").replace(/<br\\s*\\/?>/gi, " ").trim(),
        lastUpdated: r.lastUpdated || null,
        bookingPage: country.url
      };
    });
  } finally {
    p.off("request", listener);
  }
}
function filtered(rows) {
  const city = state.city.trim().toLowerCase();
  return rows.filter(r => !city || city === "any" || r.city.toLowerCase().includes(city));
}
async function checkOnce() {
  if (state.busy) return;
  state.busy = true;
  state.lastError = null;
  try {
    let rows;
    if (state.scanMode === "sweep") {
      rows = [];
      for (const code of Object.keys(COUNTRIES)) {
        try { rows.push(...await readCountry(code)); }
        catch (e) { log(`${COUNTRIES[code].name}: ${e.message}`); }
        await new Promise(r => setTimeout(r, 2500));
      }
    } else {
      rows = await readCountry(state.country);
    }
    rows = filtered(rows);
    state.rows = rows;
    state.openCount = rows.filter(r => r.open).length;
    state.lastCheck = new Date().toISOString();
    const nowOpen = new Set(rows.filter(r => r.open).map(r => `${r.country}|${r.city}|${r.date}`));
    for (const key of nowOpen) if (!previousOpen.has(key)) log("OPEN SEAT DETECTED: " + key);
    previousOpen = nowOpen;
    log(`Check complete: ${rows.length} matching rows; ${state.openCount} open.`);
  } catch (e) {
    state.lastError = e.message;
    log("Check failed: " + e.message);
  } finally {
    state.busy = false;
  }
}
function startLoop() {
  stopLoop();
  state.running = true;
  checkOnce();
  timer = setInterval(checkOnce, Math.max(30, state.interval) * 1000);
  log(`Monitor started (${state.scanMode}, every ${Math.max(30, state.interval)} seconds).`);
}
function stopLoop() {
  if (timer) clearInterval(timer);
  timer = null;
  state.running = false;
}

app.get("/api/state", (req, res) => res.json({ ...state, countries: COUNTRIES }));
app.post("/api/config", (req, res) => {
  const { country, city, interval, scanMode } = req.body || {};
  if (country && !COUNTRIES[country]) return res.status(400).json({ error: "Unknown country." });
  state.country = country || state.country;
  state.city = typeof city === "string" ? city : state.city;
  state.interval = Math.max(30, Math.min(600, Number(interval) || 30));
  state.scanMode = scanMode === "sweep" ? "sweep" : "single";
  res.json({ ok: true, state });
});
app.post("/api/start", (req, res) => { startLoop(); res.json({ ok: true }); });
app.post("/api/stop", (req, res) => { stopLoop(); log("Monitor stopped."); res.json({ ok: true }); });
app.post("/api/check", async (req, res) => { await checkOnce(); res.json({ ok: !state.lastError, state }); });
app.get("/api/countries", (req, res) => res.json(COUNTRIES));
app.post("/api/shutdown", async (req, res) => {
  stopLoop(); res.json({ ok: true });
  setTimeout(async () => { try { if (browser) await browser.close(); } catch (_) {} process.exit(0); }, 300);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Goethe B1 Monitor running at http://localhost:${PORT}`);
  console.log("For phone access, use this computer's LAN IP and keep both devices on the same Wi-Fi.");
});
process.on("SIGINT", async () => { stopLoop(); try { if (browser) await browser.close(); } catch (_) {} process.exit(0); });
