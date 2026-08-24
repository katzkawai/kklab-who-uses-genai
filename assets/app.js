const MAJOR = new Set([
  "United Arab Emirates","Singapore","Norway","Ireland","France","Spain",
  "United Kingdom","Netherlands","Australia","Canada","South Korea","Sweden",
  "United States","Germany","Italy","Japan","Brazil","India","China","Taiwan",
  "Denmark","Finland","Switzerland","Israel","New Zealand"
]);
const COLORS = {
  Japan: "#e23b2c",
  "United States": "#2f5d9f",
  Germany: "#5b4db0",
  China: "#c45c16"
};

const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const lang = () => document.documentElement.lang;
const nameOf = (o) => lang() === "ja" ? (o.name_ja || o.name || o.ja || o.en) : (o.name || o.en || o.name_ja);
const pct = (n, d=1) => Number(n).toFixed(d) + "%";

function setLang(next) {
  document.documentElement.lang = next;
  $$(".lang button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === next)));
  localStorage.setItem("lang", next);
  if (window.__data) render(window.__data);
}

function hbars(el, rows, color="#0e7c7b") {
  const max = Math.max(...rows.map(r => r.value), 1);
  el.innerHTML = rows.map(r => `
    <div class="hbar">
      <span>${r.label}</span>
      <div class="track"><div class="fill" style="width:${(r.value/max)*100}%;background:${r.color || color}"></div></div>
      <span class="mono">${pct(r.value, r.digits ?? 1)}</span>
    </div>`).join("");
}

function heatColor(v, max) {
  const t = Math.max(0, Math.min(1, v / max));
  const lr = Math.round(243 - t * (243 - 126));
  const lg = Math.round(246 - t * (246 - 20));
  const lb = Math.round(251 - t * (251 - 30));
  return `rgb(${lr},${lg},${lb})`;
}
function heatText(v, max) {
  return v / max > 0.55 ? "#fff" : "#162033";
}

function renderAgeStairs(data) {
  const series = data.mic.age_ever_used.series;
  const bands = data.mic.age_ever_used.bands;
  const active = new Set(JSON.parse(sessionStorage.getItem("ageOn") || '["Japan","United States","Germany","China"]'));
  const legend = $("#age-legend");
  legend.innerHTML = series.map(s => `
    <button class="chip" data-c="${s.name}" aria-pressed="${active.has(s.name)}">
      <span class="swatch" style="background:${COLORS[s.name]}"></span>${nameOf(s)}
      <span class="mono">${pct(s.overall,1)}</span>
    </button>`).join("");
  $$("#age-legend .chip").forEach(btn => {
    btn.onclick = () => {
      const n = btn.dataset.c;
      if (active.has(n) && active.size === 1) return;
      if (active.has(n)) active.delete(n); else active.add(n);
      sessionStorage.setItem("ageOn", JSON.stringify([...active]));
      renderAgeStairs(data);
    };
  });

  const shown = series.filter(s => active.has(s.name));
  const root = $("#age-stairs");
  root.innerHTML = bands.map((band, i) => {
    const inner = shown.map(s => {
      const v = s.values[i];
      return `<div class="stair-track" style="height:18px;margin:0 0 5px">
        <div class="stair-fill" style="width:${v}%;background:${COLORS[s.name]}">${nameOf(s)} ${pct(v,1)}</div>
      </div>`;
    }).join("");
    return `<div class="stair"><div class="stair-label">${band}</div><div>${inner}</div></div>`;
  }).join("");
}

function renderHeat(data) {
  const d = data.mic.japan_regular_use_by_age;
  const max = Math.max(...d.purposes.flatMap(p => p.values));
  const head = `<tr><th></th>${d.bands.map(b => `<th>${b}</th>`).join("")}</tr>`;
  const body = d.purposes.map(p => {
    const cells = p.values.map(v => {
      const bg = heatColor(v, max);
      const fg = heatText(v, max);
      return `<td class="cell" style="background:${bg};color:${fg}">${v.toFixed(1)}</td>`;
    }).join("");
    return `<tr><td>${lang()==="ja"?p.ja:p.en}</td>${cells}</tr>`;
  }).join("");
  $("#jp-heat").innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function renderEuPurpose(data) {
  const rows = data.eurostat.purpose_among_users_eu.by_age;
  const keys = [
    {k:"private", ja:"私生活", en:"Private", c:"#0e7c7b"},
    {k:"work", ja:"仕事", en:"Work", c:"#2f5d9f"},
    {k:"education", ja:"学校教育", en:"Education", c:"#c9892c"}
  ];
  $("#eu-purpose").innerHTML = `
    <div class="legend">${keys.map(k=>`<span><span class="swatch" style="background:${k.c}"></span>${lang()==="ja"?k.ja:k.en}</span>`).join("")}</div>
    ${rows.map(r => `
      <div style="margin:0 0 12px">
        <div class="stair-label" style="margin-bottom:4px">${r.band}</div>
        ${keys.map(k => `
          <div class="hbar">
            <span>${lang()==="ja"?k.ja:k.en}</span>
            <div class="track"><div class="fill" style="width:${r[k.k]}%;background:${k.c}"></div></div>
            <span class="mono">${pct(r[k.k],0)}</span>
          </div>`).join("")}
      </div>`).join("")}
    <p class="source">${lang()==="ja"?"複数回答。合計は100%を超える。母数は生成AI利用者。":"Multiple answers; bars can exceed 100%. Denominator is genAI users."}</p>`;
}

function renderServiceTypes(data) {
  const keys = data.mic.service_types_ever.keys.filter(k => k.id !== "any");
  const series = data.mic.service_types_ever.series;
  $("#service-types").innerHTML = keys.map(k => `
    <div style="margin:10px 0 14px">
      <div style="font-size:13px;font-weight:600;margin-bottom:6px">${lang()==="ja"?k.ja:k.en}</div>
      ${series.map(s => `
        <div class="hbar">
          <span>${nameOf(s)}</span>
          <div class="track"><div class="fill" style="width:${s[k.id]}%;background:${COLORS[s.name]}"></div></div>
          <span class="mono">${pct(s[k.id],1)}</span>
        </div>`).join("")}
    </div>`).join("");
}

function renderRank(data, mode, q) {
  const jp = data.microsoft_diffusion.japan;
  const rows = data.microsoft_diffusion.countries.filter(c => {
    if (mode === "major" && !MAJOR.has(c.name)) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return c.name.toLowerCase().includes(s) || (c.name_ja||"").includes(q) || (c.code||"").toLowerCase().includes(s);
  });
  const max = 70.1;
  const banner = `<div class="rank-row is-jp" style="border-bottom:2px solid var(--seal)">
      <span class="mono">${jp.rank_q1_2026}</span>
      <span>${lang()==="ja"?"日本（2026 Q1）":"Japan (2026 Q1)"}</span>
      <div class="bar"><span style="width:${(jp.q1_2026/max)*100}%"></span></div>
      <span class="mono">${pct(jp.q1_2026,1)}</span>
    </div>`;
  $("#rank-list").innerHTML = banner + rows.map(c => `
    <div class="rank-row ${c.name==="Japan"?"is-jp":(MAJOR.has(c.name)?"is-major":"")}">
      <span class="mono">${c.rank_q1_2026}</span>
      <span>${nameOf(c)}</span>
      <div class="bar"><span style="width:${(c.q1_2026/max)*100}%"></span></div>
      <span class="mono">${pct(c.q1_2026,1)}</span>
    </div>`).join("");
}

function renderEuRank(data) {
  const max = data.eurostat.countries[0].pct_last_3_months;
  $("#eu-rank").innerHTML = data.eurostat.countries.map((c,i) => `
    <div class="rank-row">
      <span class="mono">${i+1}</span>
      <span>${nameOf(c)}</span>
      <div class="bar"><span style="width:${(c.pct_last_3_months/max)*100}%;background:#1f6f8b"></span></div>
      <span class="mono">${pct(c.pct_last_3_months,1)}</span>
    </div>`).join("");
}

function render(data) {
  renderAgeStairs(data);
  renderHeat(data);
  renderEuPurpose(data);
  renderServiceTypes(data);
  renderEuRank(data);

  hbars($("#eu-age"), data.eurostat.age_eu.filter(a => ["16–24","25–34","35–44","45–54","55–64","65–74"].includes(a.band)).map(a => ({
    label: a.band, value: a.pct
  })));
  hbars($("#eu-edu"), [
    {label: lang()==="ja"?"高等教育":"High education", value: data.eurostat.education_25_64.high},
    {label: lang()==="ja"?"中等教育":"Medium", value: data.eurostat.education_25_64.medium},
    {label: lang()==="ja"?"低学歴":"Low", value: data.eurostat.education_25_64.low}
  ]);
  hbars($("#pew-who"), [
    ...data.pew.chatbot_ever_2026_age.map(a => ({label: a.band, value: a.pct})),
    ...data.pew.chatbot_ever_2026_race.map(a => ({label: lang()==="ja"?a.ja:a.en, value: a.pct, color:"#2f5d9f"}))
  ]);
  hbars($("#pew-edu"), data.pew.chatgpt_2025_education.map(a => ({label: lang()==="ja"?a.ja:a.en, value: a.pct})));
  hbars($("#openai-topics"), data.openai_nber.topics.map(t => ({label: lang()==="ja"?t.ja:t.en, value: t.pct})));
  hbars($("#pew-use"), data.pew.uses_2026_adults.map(t => ({label: lang()==="ja"?t.ja:t.en, value: t.all, digits:0})));
  hbars($("#docomo-use"), data.docomo.uses_among_users_2025.map(t => ({label: lang()==="ja"?t.ja:t.en, value: t.pct, digits:0})));
  hbars($("#pew-tools"), data.pew.tools_2026.map(t => ({label: t.name, value: t.all, digits:0})));
  const wb = data.world_bank.chatgpt_users_share_of_internet_users_apr2025;
  hbars($("#wb-income"), [
    {label: lang()==="ja"?"高所得":"High income", value: wb.high_income, digits:1},
    {label: lang()==="ja"?"上位中所得":"Upper-middle", value: wb.upper_middle, digits:1},
    {label: lang()==="ja"?"下位中所得":"Lower-middle", value: wb.lower_middle, digits:1},
    {label: lang()==="ja"?"低所得":"Low income", value: wb.low_income, digits:1}
  ], "#c45c16");

  const mode = document.querySelector('.chip[data-rank][aria-pressed="true"]')?.dataset.rank || "major";
  renderRank(data, mode, $("#rank-q").value.trim());
}

async function main() {
  const params = new URLSearchParams(location.search);
  const saved = params.get("lang") || localStorage.getItem("lang");
  if (saved === "en" || saved === "ja") document.documentElement.lang = saved;
  $$(".lang button").forEach(b => {
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang()));
    b.onclick = () => setLang(b.dataset.lang);
  });
  const data = await fetch("data/dataset.json").then(r => r.json());
  window.__data = data;
  $$(".chip[data-rank]").forEach(b => {
    b.onclick = () => {
      $$(".chip[data-rank]").forEach(x => x.setAttribute("aria-pressed","false"));
      b.setAttribute("aria-pressed","true");
      renderRank(data, b.dataset.rank, $("#rank-q").value.trim());
    };
  });
  $("#rank-q").addEventListener("input", () => {
    const mode = document.querySelector('.chip[data-rank][aria-pressed="true"]').dataset.rank;
    renderRank(data, mode, $("#rank-q").value.trim());
  });
  render(data);
}
main().catch(err => {
  document.body.insertAdjacentHTML("afterbegin", `<p class="note">Failed to load data/dataset.json: ${err}</p>`);
});
