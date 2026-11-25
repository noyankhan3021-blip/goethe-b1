let installPrompt = null;
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(()=>{}));
}
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  const b = document.getElementById("install");
  if (b) b.classList.remove("hidden");
});
window.addEventListener("appinstalled", () => {
  const b = document.getElementById("install");
  if (b) { b.textContent = "Installed"; b.classList.remove("hidden"); }
});
const $ = id => document.getElementById(id);
let previousOpenKeys = new Set();
let clearLogs = false;

async function api(url, method="GET", body) {
  const r = await fetch(url, { method, headers: {"Content-Type":"application/json"}, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
function esc(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmt(t){if(!t)return "—";return new Date(t).toLocaleString();}
function notifyOpen(row){
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Goethe B1 seat open", { body: `${row.city} · ${row.date}` });
  }
  try { const a = new AudioContext(); const o=a.createOscillator(); const g=a.createGain(); o.connect(g);g.connect(a.destination);o.frequency.value=880;g.gain.value=.08;o.start();o.stop(a.currentTime+.35); } catch(_){}
}
function render(s){
  $("status").textContent=s.running?"MONITORING":(s.busy?"CHECKING":"STOPPED");
  $("status").className="pill "+(s.running?"on":"off");
  $("total").textContent=s.rows.length;
  $("opens").textContent=s.openCount;
  $("last").textContent=s.lastCheck?new Date(s.lastCheck).toLocaleTimeString():"—";
  $("error").textContent=s.lastError||"";
  $("error").classList.toggle("hidden",!s.lastError);
  const rows=s.rows||[];
  $("rows").innerHTML=rows.length?rows.map(r=>{
    const key=`${r.country}|${r.city}|${r.date}`;
    if(r.open&&!previousOpenKeys.has(key)) notifyOpen(r);
    return `<article class="row"><div><strong>${esc(r.city)}</strong><small>${esc(r.country)}</small></div><div><strong>${esc(r.date||"Date not listed")}</strong><small>${r.availabilityText?esc(r.availabilityText):"Availability: "+esc(r.availability??"not stated")}</small></div><span class="badge ${r.open?"open":""}">${r.open?"OPEN":"NOT OPEN"}</span><a class="book" href="${esc(r.bookingPage)}" target="_blank" rel="noopener">OPEN OFFICIAL PAGE ↗</a></article>`;
  }).join(""):'<div class="empty">No matching exam rows returned.</div>';
  previousOpenKeys=new Set(rows.filter(r=>r.open).map(r=>`${r.country}|${r.city}|${r.date}`));
  if(!clearLogs) $("logs").innerHTML=(s.logs||[]).slice(0,60).map(x=>`<div class="log"><time>${new Date(x.time).toLocaleTimeString()}</time>${esc(x.message)}</div>`).join("")||'<div class="muted">No activity yet.</div>';
}
async function refresh(){try{render(await api("/api/state"));}catch(e){$("error").textContent=e.message;$("error").classList.remove("hidden");}}
async function saveConfig(){
  await api("/api/config","POST",{country:$("country").value,city:$("city").value,interval:Number($("interval").value),scanMode:$("mode").value});
}
async function action(name){try{await saveConfig();await api("/api/"+name,"POST");await refresh();}catch(e){$("error").textContent=e.message;$("error").classList.remove("hidden");}}
$("start").onclick=()=>action("start");
$("stop").onclick=()=>action("stop");
$("check").onclick=()=>action("check");
$("notify").onclick=async()=>{if("Notification"in window){const p=await Notification.requestPermission();$("notify").textContent=p==="granted"?"Alerts enabled":"Alerts blocked";}};
$("clear").onclick=()=>{clearLogs=true;$("logs").innerHTML='<div class="muted">View cleared. New events will appear here.</div>';};
async function init(){
 const countries=await api("/api/countries");
 $("country").innerHTML=Object.entries(countries).map(([k,v])=>`<option value="${k}">${esc(v.name)}</option>`).join("");
 $("country").value="pk";
 await refresh();
 setInterval(refresh,3000);
}
init().catch(e=>{$("error").textContent=e.message;$("error").classList.remove("hidden");});
const installButton = document.getElementById("install");
if (installButton) installButton.addEventListener("click", async () => {
  if (!installPrompt) {
    alert("Chrome menu (⋮) > Install app ya Add to Home screen select karein.");
    return;
  }
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.classList.add("hidden");
});
