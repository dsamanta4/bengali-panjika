/* ============================================================
   ui.js — dashboard
   ============================================================ */

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const bnNum = n => String(n).replace(/[0-9]/g, d => BN_DIGITS[+d]);
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MON3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW3 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const LOCATIONS = [
  { name: 'Kolkata',    lat: 22.5726, lon: 88.3639, tz: 5.5 / 24 },
  { name: 'Mumbai',     lat: 19.0760, lon: 72.8777, tz: 5.5 / 24 },
  { name: 'Aurangabad', lat: 19.8762, lon: 75.3433, tz: 5.5 / 24 },
  { name: 'Delhi',      lat: 28.6139, lon: 77.2090, tz: 5.5 / 24 },
  { name: 'Bengaluru',  lat: 12.9716, lon: 77.5946, tz: 5.5 / 24 },
  { name: 'Chennai',    lat: 13.0827, lon: 80.2707, tz: 5.5 / 24 },
  { name: 'Guwahati',   lat: 26.1445, lon: 91.7362, tz: 5.5 / 24 },
  { name: 'Dhaka',      lat: 23.8103, lon: 90.4125, tz: 6.0 / 24 },
  { name: 'Siliguri',   lat: 26.7271, lon: 88.3953, tz: 5.5 / 24 },
];

const S = {
  rd: null, viewY: 0, viewM: 0, engine: 'drik', loc: 0,
  view: 'month', theme: 'light', query: '',
};
const evCache = new Map();                                   // 'year|engine|loc' -> Map(rd->[ev])

function todayRD() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 3600000);                 // always reckon "today" in IST
  return gregToRD(ist.getFullYear(), ist.getMonth() + 1, ist.getDate());
}
function eventsFor(y) {
  const k = y + '|' + S.engine + '|' + S.loc;
  if (!evCache.has(k)) evCache.set(k, buildYearEvents(y, dayContext));
  return evCache.get(k);
}
const eventsOn = rd => eventsFor(rdToGreg(rd).y).get(rd) || [];

/* ---------- formatting ---------- */
function fmtT(tee, refRd) {
  if (tee == null || !isFinite(tee)) return '—';
  const day = Math.floor(tee);
  let mins = Math.round((tee - day) * 1440);
  let d = day;
  if (mins >= 1440) { mins -= 1440; d += 1; }
  const s = String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
  if (refRd == null || d === refRd) return s;
  const diff = d - refRd;
  return s + (diff === 1 ? ' ⁺¹' : diff === -1 ? ' ⁻¹' : ' (' + MON3[rdToGreg(d).m - 1] + ' ' + rdToGreg(d).d + ')');
}
const fmtDur = f => { const m = Math.round(f * 1440); return Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm'; };
const gstr = rd => { const g = rdToGreg(rd); return g.d + ' ' + MON3[g.m - 1] + ' ' + g.y; };

/* ---------- moon glyph ---------- */
function moonPathD(cx, cy, r, frac, waxing) {
  const k = Math.max(0, Math.min(1, frac));
  const s1 = waxing ? 1 : 0, rx = Math.abs(r * (1 - 2 * k));
  const s2 = (k > 0.5) ? (waxing ? 1 : 0) : (waxing ? 0 : 1);
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${s1} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${s2} ${cx} ${cy - r} Z`;
}
const moonMark = (cx, cy, r, frac, waxing) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--panel2)" stroke="var(--line2)" stroke-width=".7"/>` +
  `<path d="${moonPathD(cx, cy, r, frac, waxing)}" fill="var(--gold)"/>`;

function moonSVG(frac, waxing, size) {
  const r = size / 2 - 1, c = size / 2;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${moonMark(c, c, r, frac, waxing)}</svg>`;
}

/* ============================================================
   render
   ============================================================ */
function render() {
  setEngine(S.engine);
  setLocation(LOCATIONS[S.loc]);
  document.documentElement.dataset.theme = S.theme;
  const app = document.getElementById('app');
  app.innerHTML = topbar() + `<div class="cols">
      <div class="col-a">${S.view === 'year' ? yearCard() : (S.view === 'bmonth' ? bmonthCard() : monthCard()) + chartsBlock()}</div>
      <div class="col-b">${detailCard()}</div>
      <div class="col-c">${festivalListCard()}</div>
    </div>` + footer();
  wire();
}

function topbar() {
  const t = todayRD();
  return `<div class="topbar">
    <div class="brand">
      <h1>Bengali Panjika <span class="bn" style="color:var(--accent)">বাংলা পঞ্জিকা</span></h1>
      <div class="sub">Bangabda · Gregorian · tithi, nakshatra, festivals and holidays — computed live for ${LOCATIONS[S.loc].name}</div>
    </div>
    <div class="seg">
      <button data-view="month" class="${S.view === 'month' ? 'on' : ''}">English month</button>
      <button data-view="bmonth" class="${S.view === 'bmonth' ? 'on' : ''}">Bengali month</button>
      <button data-view="year" class="${S.view === 'year' ? 'on' : ''}">Year</button>
    </div>
    <div class="ctl">
      <button class="btn-today" id="btnToday">Today · ${gstr(t)}</button>
      <input type="date" id="dpick" value="${isoOf(S.rd)}">
    </div>
    <div class="ctl">
      <select id="engine" title="Which panjika reckoning to use">
        <option value="drik" ${S.engine === 'drik' ? 'selected' : ''}>Drik ganita</option>
        <option value="ss" ${S.engine === 'ss' ? 'selected' : ''}>Surya Siddhanta</option>
      </select>
      <select id="loc">${LOCATIONS.map((l, i) => `<option value="${i}" ${i === S.loc ? 'selected' : ''}>${l.name}</option>`).join('')}</select>
      <button id="theme" title="Light / dark">${S.theme === 'light' ? '☾' : '☀'}</button>
    </div></div>`;
}
const isoOf = rd => { const g = rdToGreg(rd); return `${g.y}-${String(g.m).padStart(2, '0')}-${String(g.d).padStart(2, '0')}`; };

/* ---------------- month grid ---------------- */
function monthCard() {
  const first = gregToRD(S.viewY, S.viewM + 1, 1);
  const days = gregToRD(S.viewM === 11 ? S.viewY + 1 : S.viewY, S.viewM === 11 ? 1 : S.viewM + 2, 1) - first;
  const lead = weekday(first);
  const t = todayRD();
  const b1 = bengaliDate(first), b2 = bengaliDate(first + days - 1);
  const bnLabel = b1.monthIndex === b2.monthIndex
    ? `${b1.month.en} ${b1.year}` : `${b1.month.en} – ${b2.month.en} ${b2.year}`;
  const bnLabelBn = b1.monthIndex === b2.monthIndex
    ? `${b1.month.bn} ${bnNum(b1.year)}` : `${b1.month.bn}–${b2.month.bn} ${bnNum(b2.year)}`;

  let cells = '';
  for (let i = 0; i < lead; i++) {
    const rd = first - lead + i; cells += cell(rd, true, t);
  }
  for (let i = 0; i < days; i++) cells += cell(first + i, false, t);
  const tail = (7 - (lead + days) % 7) % 7;
  for (let i = 0; i < tail; i++) cells += cell(first + days + i, true, t);

  return `<div class="card">
    <div class="mhead">
      <div><div class="t1">${MON[S.viewM]} ${S.viewY}</div>
        <div class="t2">${bnLabel} <span class="bn">· ${bnLabelBn}</span></div></div>
      <div class="nav">
        <button data-nav="-12" title="Previous year">«</button>
        <button data-nav="-1" title="Previous month">‹</button>
        <button data-nav="1" title="Next month">›</button>
        <button data-nav="12" title="Next year">»</button>
      </div></div>
    <div class="grid">
      ${DOW3.map((d, i) => `<div class="dow ${i === 0 ? 'sun' : ''}">${d}</div>`).join('')}
      ${cells}
    </div>
    <div class="legend">
      <span><i style="background:var(--puja)"></i>Puja / festival</span>
      <span><i style="background:var(--national)"></i>National</span>
      <span><i style="background:var(--wb)"></i>Observance</span>
      <span><i style="background:var(--other)"></i>Other faiths</span>
      <span><i style="background:var(--ekadashi)"></i>Ekadashi</span>
      <span><i style="background:var(--gold)"></i>Sankranti</span>
      <span><i style="background:var(--lunar)"></i>Purnima / Amavasya</span>
    </div></div>`;
}

function bmonthCard() {
  const b = bengaliDate(S.rd), t = todayRD();
  const lead = weekday(b.monthStart);
  let cells = '';
  for (let i = 0; i < lead; i++) cells += cell(b.monthStart - lead + i, true, t, true);
  for (let rd = b.monthStart; rd <= b.monthEnd; rd++) cells += cell(rd, false, t, true);
  const tail = (7 - (lead + b.monthLength) % 7) % 7;
  for (let i = 0; i < tail; i++) cells += cell(b.monthEnd + 1 + i, true, t, true);
  return `<div class="card">
    <div class="mhead">
      <div><div class="t1">${b.month.en} ${b.year} <span class="bn" style="color:var(--accent)">${b.month.bn} ${bnNum(b.year)}</span></div>
        <div class="t2">${gstr(b.monthStart)} – ${gstr(b.monthEnd)} · ${b.monthLength} days · ${b.month.rashi} rashi</div></div>
      <div class="nav">
        <button data-bnav="-1" title="Previous Bengali month">‹</button>
        <button data-bnav="1" title="Next Bengali month">›</button>
      </div></div>
    <div class="grid">
      ${DOW3.map((d, i) => `<div class="dow ${i === 0 ? 'sun' : ''}">${d}</div>`).join('')}
      ${cells}
    </div>
    <div class="legend">
      <span><i style="background:var(--puja)"></i>Puja / festival</span>
      <span><i style="background:var(--national)"></i>National</span>
      <span><i style="background:var(--wb)"></i>Observance</span>
      <span><i style="background:var(--other)"></i>Other faiths</span>
      <span><i style="background:var(--ekadashi)"></i>Ekadashi</span>
      <span><i style="background:var(--gold)"></i>Sankranti</span>
      <span><i style="background:var(--lunar)"></i>Purnima / Amavasya</span>
    </div></div>`;
}

function cell(rd, out, t, bengaliFirst) {
  const g = rdToGreg(rd), b = bengaliDate(rd), ctx = dayContext(rd);
  const evs = eventsOn(rd);
  const hol = evs.some(e => e.holiday);
  const ti = describeTithi(ctx.tithiIndexSunrise);
  const ill = moonIllumination(sunriseAt(rd));
  const shown = evs.filter(e => e.cat !== 'lunar' || ti.index === 14 || ti.index === 29).slice(0, 3);
  return `<div class="cell ${out ? 'out' : ''} ${rd === t ? 'today' : ''} ${rd === S.rd ? 'sel' : ''} ${hol ? 'holiday' : ''} ${weekday(rd) === 0 ? 'sunday' : ''}" data-rd="${rd}">
    <div class="r1">${bengaliFirst
      ? `<span class="dnum" style="color:var(--accent)">${bnNum(b.day)}</span><span class="bnum" style="color:var(--ink2)">${g.d} ${MON3[g.m - 1]}</span>`
      : `<span class="dnum">${g.d}</span><span class="bnum bn">${bnNum(b.day)}</span>`}
      <span class="moonchip">${moonSVG(ill.fraction, ill.waxing, 13)}</span></div>
    <div class="tinfo">${ti.paksha[0]}·${ti.name}</div>
    <div class="evs">${shown.map(e => `<div class="ev ${e.cat} ${e.holiday ? 'hol' : ''}" title="${esc(e.name)}">${esc(e.name)}</div>`).join('')}
      ${evs.length > shown.length ? `<div class="more">+${evs.length - shown.length}</div>` : ''}</div>
    <div class="dots">${evs.slice(0, 5).map(e => `<span class="pd ${e.cat}"></span>`).join('')}</div>
  </div>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- day detail ---------------- */
function detailCard() {
  const rd = S.rd, p = panjika(rd), g = p.greg, b = p.bengali;
  const evs = eventsOn(rd);
  const seq = (arr, key) => arr.map(x => `${x.name || x.nameBn}<span class="sm"> to ${fmtT(x.end, rd)}</span>`).join('<br>');

  const div = divergenceNote(rd);
  return `<div class="card detail">
    <div class="big">
      <div class="dw">${p.weekdayName.en} <span class="bn">· ${p.weekdayName.bn}</span></div>
      <div class="de">${g.d} ${MON[g.m - 1]} ${g.y}</div>
      <div class="db bn">${bnNum(b.day)} ${b.month.bn} ${bnNum(b.year)}</div>
      <div class="db" style="font-size:13px">${b.day} ${b.month.en} ${b.year} BS · Saka ${b.sakaYear}</div>
      <div class="dmeta">${b.month.rashi} rashi · month of ${b.monthLength} days · lunar month ${p.lunar.name}${p.lunar.adhika ? ' (Adhika)' : ''}</div>
    </div>
    <dl class="kv">
      <dt>Tithi</dt><dd>${p.tithi.map(x => `<b>${x.paksha} ${x.name}</b><span class="sm"> to ${fmtT(x.end, rd)}</span>`).join('<br>')}</dd>
      <dt>Nakshatra</dt><dd>${seq(p.nakshatra)}</dd>
      <dt>Yoga</dt><dd>${seq(p.yoga)}</dd>
      <dt>Karana</dt><dd>${seq(p.karana)}</dd>
    </dl>
    <dl class="kv">
      <dt>Sunrise</dt><dd>${fmtT(p.sunrise, rd)} <span class="sm">· sunset ${fmtT(p.sunset, rd)}</span></dd>
      <dt>Day length</dt><dd>${fmtDur(p.dayLength)}</dd>
      <dt>Moonrise</dt><dd>${fmtT(p.moonrise, rd)} <span class="sm">· moonset ${fmtT(p.moonset, rd)}</span></dd>
      <dt>Moon</dt><dd style="display:flex;align-items:center;gap:7px">${moonSVG(p.illumination.fraction, p.illumination.waxing, 18)}
        ${(p.illumination.fraction * 100).toFixed(0)}% ${p.illumination.waxing ? 'waxing' : 'waning'}</dd>
      <dt>Rahu kal</dt><dd>${fmtT(p.rahukal.start, rd)} – ${fmtT(p.rahukal.end, rd)}</dd>
      <dt>Sun · Moon</dt><dd class="sm">${p.rashiSun} ${(p.sunLongitude % 30).toFixed(1)}° · ${p.rashiMoon} ${(p.moonLongitude % 30).toFixed(1)}°</dd>
      ${p.sankranti ? `<dt>Sankranti</dt><dd><b>${p.sankranti.name}</b> <span class="bn">${p.sankranti.nameBn}</span><span class="sm"> at ${fmtT(p.sankranti.moment, rd)}</span></dd>` : ''}
    </dl>
    ${evs.length ? `<div class="evlist">${evs.map(e => `<div class="evrow"><span class="dot ${e.cat}"></span>
        <span><span class="n">${esc(e.name)}</span> ${e.bn ? `<span class="bn" style="color:var(--ink2)">${e.bn}</span>` : ''}
        ${e.note ? `<div class="note">${esc(e.note)}</div>` : ''}</span>
        ${e.holiday ? `<span class="tag ${e.holiday === 'gazetted' ? 'gaz' : 'wb'}">${e.holiday === 'gazetted' ? 'Gazetted' : 'WB'}</span>` : ''}
      </div>`).join('')}</div>` : '<div class="evlist"><span style="color:var(--ink2);font-size:12.5px">No listed observance.</span></div>'}
    ${div ? `<div class="divergence">${div}</div>` : ''}
    ${dialSVG(p)}
  </div>`;
}

/* does the other panjika disagree about this day's Bengali date or tithi? */
function divergenceNote(rd) {
  const other = S.engine === 'drik' ? 'ss' : 'drik';
  const a = dayContext(rd);
  setEngine(other);
  const b = dayContext(rd);
  setEngine(S.engine);
  const bits = [];
  if (a.bengali.day !== b.bengali.day || a.bengali.monthIndex !== b.bengali.monthIndex)
    bits.push(`Bengali date <b>${b.bengali.day} ${b.bengali.month.en}</b>`);
  if (a.tithiIndexSunrise !== b.tithiIndexSunrise) {
    const t = describeTithi(b.tithiIndexSunrise);
    bits.push(`sunrise tithi <b>${t.paksha} ${t.name}</b>`);
  }
  if (!bits.length) return '';
  const oname = other === 'ss' ? 'Surya Siddhanta' : 'drik ganita';
  return `The ${oname} reckoning gives ${bits.join(' and ')} for this day. Panjikas differ on roughly this many days a year; check which one your family follows.`;
}

/* ---------------- rashi dial ---------------- */
function dialSVG(p) {
  const R = 74, C = 92, cx = C, cy = C;
  const sun = p.sunLongitude, moon = p.moonLongitude;
  const pt = (deg, r) => [cx + r * Math.sin(deg * Math.PI / 180), cy - r * Math.cos(deg * Math.PI / 180)];
  let seg = '';
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = pt(i * 30, R - 16), [x2, y2] = pt(i * 30, R);
    const [tx, ty] = pt(i * 30 + 15, R - 8);
    seg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="gl"/>
            <text x="${tx}" y="${ty + 3}" class="axis" text-anchor="middle">${RASHI_BN[i]}</text>`;
  }
  const [sx, sy] = pt(sun, R - 30), [mx, my] = pt(moon, R - 44);
  return `<div class="body" style="border-top:1px solid var(--line)">
   <div style="display:flex;gap:14px;align-items:center">
    <svg viewBox="0 0 ${C * 2} ${C * 2}" width="150" height="150">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" class="gl"/>
      <circle cx="${cx}" cy="${cy}" r="${R - 16}" fill="none" class="gl"/>
      ${seg}
      <line x1="${cx}" y1="${cy}" x2="${sx}" y2="${sy}" stroke="var(--gold)" stroke-width="1.5"/>
      <circle cx="${sx}" cy="${sy}" r="7" fill="var(--gold)"/>
      <line x1="${cx}" y1="${cy}" x2="${mx}" y2="${my}" stroke="var(--accent2)" stroke-width="1.5"/>
      <circle cx="${mx}" cy="${my}" r="6" fill="var(--accent2)"/>
      <circle cx="${cx}" cy="${cy}" r="3" fill="var(--ink2)"/>
    </svg>
    <div style="font-size:12px;line-height:1.7;color:var(--ink2)">
      <div><b style="color:var(--gold)">●</b> Sun — ${p.rashiSun} ${(p.sunLongitude % 30).toFixed(1)}°</div>
      <div><b style="color:var(--accent2)">●</b> Moon — ${p.rashiMoon} ${(p.moonLongitude % 30).toFixed(1)}°</div>
      <div>Elongation ${mod(p.moonLongitude - p.sunLongitude, 360).toFixed(1)}°</div>
      <div style="margin-top:5px">Sidereal positions at sunrise.<br>Tithi = elongation ÷ 12°.</div>
    </div></div></div>`;
}

/* ---------------- charts ---------------- */
function chartsBlock() {
  return `<div class="charts" style="margin-top:18px">
    ${cardChart('Moon through the month', moonStrip())}
    ${cardChart('Tithi length — how fast the moon is moving', tithiChart())}
    ${cardChart('Daylight across ' + S.viewY, daylightChart())}
    ${cardChart('Festival density — ' + S.viewY, heatChart())}
  </div>`;
}
const cardChart = (title, svg) => `<div class="card chart"><header><h2>${title}</h2></header><div class="body">${svg}</div></div>`;

function monthDays() {
  if (S.view === 'bmonth') {
    const b = bengaliDate(S.rd);
    return Array.from({ length: b.monthEnd - b.monthStart + 1 }, (_, i) => b.monthStart + i);
  }
  const first = gregToRD(S.viewY, S.viewM + 1, 1);
  const n = gregToRD(S.viewM === 11 ? S.viewY + 1 : S.viewY, S.viewM === 11 ? 1 : S.viewM + 2, 1) - first;
  return Array.from({ length: n }, (_, i) => first + i);
}

function moonStrip() {
  const ds = monthDays(), W = 640, H = 132, pad = 10;
  const step = (W - pad * 2) / ds.length;
  const r = Math.min(step / 2 - 1.5, 11);
  let s = '';
  ds.forEach((rd, i) => {
    const ill = moonIllumination(sunriseAt(rd));
    const cx = pad + i * step + step / 2, cy = 58;
    const ctx = dayContext(rd);
    const full = ctx.tithiIndexSunrise === 14, newm = ctx.tithiIndexSunrise === 29;
    s += `<g data-rd="${rd}" style="cursor:pointer"><title>${gstr(rd)} — ${(ill.fraction * 100).toFixed(0)}% ${ill.waxing ? 'waxing' : 'waning'}</title>`;
    s += moonMark(cx, cy, r, ill.fraction, ill.waxing);
    s += `</g>`;
    if (i % 2 === 0 || full || newm)
      s += `<text x="${cx}" y="34" class="axis" text-anchor="middle" ${full || newm ? 'style="fill:var(--accent);font-weight:700"' : ''}>${rdToGreg(rd).d}</text>`;
    if (full || newm)
      s += `<text x="${cx}" y="${cy + r + 18}" class="axis" text-anchor="middle" style="fill:var(--accent);font-weight:600">${full ? 'Purnima' : 'Amavasya'}</text>`;
    if (rd === S.rd) s += `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="none" stroke="var(--accent)" stroke-width="1.4"/>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}">${s}</svg>
   <div style="font-size:11.5px;color:var(--ink2);margin-top:2px">Illuminated fraction at sunrise for each day of the month. Purnima and Amavasya are the two tithis that anchor most of the puja calendar.</div>`;
}

function tithiChart() {
  const ds = monthDays(), W = 640, H = 190, L = 34, R = 10, T = 12, B = 26;
  const vals = ds.map(rd => {
    const ctx = dayContext(rd), n = ctx.tithiIndexSunrise;
    const start = tithiCross(n, sunriseAt(rd) - 0.6), end = tithiCross(n + 1, start + 1);
    return { rd, hours: (end - start) * 24, t: describeTithi(n) };
  });
  const lo = 19, hi = 27;
  const x = i => L + (W - L - R) * (i + .5) / vals.length;
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const bw = (W - L - R) / vals.length * .72;
  let g = '';
  for (let v = 20; v <= 26; v += 2)
    g += `<line x1="${L}" y1="${y(v)}" x2="${W - R}" y2="${y(v)}" class="gl"/><text x="${L - 6}" y="${y(v) + 3}" class="axis" text-anchor="end">${v}h</text>`;
  let bars = '';
  vals.forEach((v, i) => {
    const yy = y(Math.max(lo, Math.min(hi, v.hours)));
    const col = v.t.index === 14 || v.t.index === 29 ? 'var(--accent)' : 'var(--accent2)';
    bars += `<rect x="${x(i) - bw / 2}" y="${yy}" width="${bw}" height="${H - B - yy}" rx="2" fill="${col}" opacity=".82">
      <title>${gstr(v.rd)} — ${v.t.paksha} ${v.t.name}, ${v.hours.toFixed(1)} h</title></rect>`;
    if (i % 4 === 0) bars += `<text x="${x(i)}" y="${H - 8}" class="axis" text-anchor="middle">${rdToGreg(v.rd).d}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}">${g}${bars}</svg>
   <div style="font-size:11.5px;color:var(--ink2);margin-top:6px">A tithi is 12° of moon–sun elongation, so it stretches near apogee and compresses near perigee. Short tithis are what cause a date to be skipped (kshaya); long ones cause a repeated date (vriddhi). Red bars are Purnima and Amavasya.</div>`;
}

function daylightChart() {
  const y0 = gregToRD(S.viewY, 1, 1), y1 = gregToRD(S.viewY + 1, 1, 1);
  const n = y1 - y0, W = 640, H = 210, L = 40, R = 10, T = 12, B = 26;
  const pts = [];
  for (let i = 0; i < n; i += 1) {
    const rd = y0 + i;
    pts.push([i, (sunriseAt(rd) - rd) * 24, (sunsetAt(rd) - rd) * 24]);
  }
  const lo = 4.5, hi = 19;
  const X = i => L + (W - L - R) * i / (n - 1);
  const Y = h => T + (H - T - B) * (1 - (h - lo) / (hi - lo));
  const up = pts.map(p => `${X(p[0])},${Y(p[1])}`).join(' ');
  const dn = pts.slice().reverse().map(p => `${X(p[0])},${Y(p[2])}`).join(' ');
  let g = '';
  for (let h = 6; h <= 18; h += 3) g += `<line x1="${L}" y1="${Y(h)}" x2="${W - R}" y2="${Y(h)}" class="gl"/><text x="${L - 6}" y="${Y(h) + 3}" class="axis" text-anchor="end">${h}:00</text>`;
  let mk = '';
  for (let m = 0; m < 12; m++) {
    const i = gregToRD(S.viewY, m + 1, 1) - y0;
    mk += `<text x="${X(i)}" y="${H - 8}" class="axis" text-anchor="middle">${MON3[m][0]}</text>`;
  }
  const selI = Math.max(0, Math.min(n - 1, S.rd - y0));
  return `<svg viewBox="0 0 ${W} ${H}">${g}
    <polygon points="${up} ${dn}" fill="var(--gold)" opacity=".26"/>
    <polyline points="${up}" fill="none" stroke="var(--gold)" stroke-width="1.4"/>
    <polyline points="${pts.map(p => `${X(p[0])},${Y(p[2])}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="1.4"/>
    <line x1="${X(selI)}" y1="${T}" x2="${X(selI)}" y2="${H - B}" stroke="var(--ink2)" stroke-dasharray="3 3"/>
    ${mk}</svg>
   <div style="font-size:11.5px;color:var(--ink2);margin-top:6px">Sunrise (lower line) and sunset for ${LOCATIONS[S.loc].name}; the shaded band is daylight. The dashed line marks the selected date. Bengali solar months turn over on the sun's sidereal ingress, which is why month lengths run 29–32 days.</div>`;
}

function heatChart() {
  const W = 640, cellW = (W - 46) / 31, cellH = 15;
  const H = 12 * (cellH + 2) + 26;
  let s = '';
  for (let m = 0; m < 12; m++) {
    const first = gregToRD(S.viewY, m + 1, 1);
    const dim = gregToRD(m === 11 ? S.viewY + 1 : S.viewY, m === 11 ? 1 : m + 2, 1) - first;
    s += `<text x="40" y="${20 + m * (cellH + 2) + 11}" class="axis" text-anchor="end">${MON3[m]}</text>`;
    for (let d = 0; d < dim; d++) {
      const rd = first + d, evs = eventsOn(rd);
      const major = evs.filter(e => e.cat === 'puja' || e.cat === 'national' || e.cat === 'other-faith');
      const hol = evs.some(e => e.holiday);
      const k = Math.min(major.length, 3);
      const fill = hol ? 'var(--accent)' : k ? `color-mix(in srgb, var(--accent2) ${25 + k * 22}%, transparent)` : 'var(--panel2)';
      s += `<rect x="${46 + d * cellW}" y="${20 + m * (cellH + 2)}" width="${cellW - 1.5}" height="${cellH}" rx="2.5"
             fill="${fill}" data-rd="${rd}" class="hcell" style="cursor:pointer">
             <title>${gstr(rd)}${evs.length ? ' — ' + evs.map(e => e.name).join(', ') : ''}</title></rect>`;
    }
  }
  for (let d = 0; d < 31; d += 5) s += `<text x="${46 + d * cellW + cellW / 2}" y="14" class="axis" text-anchor="middle">${d + 1}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}">${s}</svg>
   <div style="font-size:11.5px;color:var(--ink2);margin-top:6px">Solid red = public holiday; deeper teal = more festivals that day. The autumn block is Durga Puja through Kali Puja and Bhai Phonta. Hover a square for the list, click to open the day.</div>`;
}

/* ---------------- year view ---------------- */
function yearCard() {
  const t = todayRD();
  let s = '';
  for (let m = 0; m < 12; m++) {
    const first = gregToRD(S.viewY, m + 1, 1);
    const dim = gregToRD(m === 11 ? S.viewY + 1 : S.viewY, m === 11 ? 1 : m + 2, 1) - first;
    const lead = weekday(first);
    const b = bengaliDate(first);
    let g = DOW3.map(d => `<div class="hd">${d[0]}</div>`).join('');
    for (let i = 0; i < lead; i++) g += '<div></div>';
    for (let d = 0; d < dim; d++) {
      const rd = first + d, evs = eventsOn(rd);
      const hol = evs.some(e => e.holiday), fest = evs.some(e => e.cat === 'puja' || e.cat === 'other-faith');
      g += `<div class="${hol ? 'h' : fest ? 'f' : ''} ${rd === t ? 't' : ''}" data-rd="${rd}"
             title="${gstr(rd)}${evs.length ? ' — ' + evs.map(e => e.name).join(', ') : ''}">${d + 1}</div>`;
    }
    s += `<div class="mini"><h3>${MON[m]} <span>${b.month.en} ${b.year}</span></h3><div class="mg">${g}</div></div>`;
  }
  return `<div class="card">
    <div class="mhead"><div><div class="t1">${S.viewY}</div>
      <div class="t2">Bangabda ${bengaliDate(gregToRD(S.viewY, 1, 1)).year}–${bengaliDate(gregToRD(S.viewY, 12, 31)).year}</div></div>
      <div class="nav"><button data-nav="-12">‹</button><button data-nav="12">›</button></div></div>
    <div class="yeargrid">${s}</div></div>`;
}

/* ---------------- festival list / search ---------------- */
function festivalListCard() {
  const y = S.viewY;
  const map = eventsFor(y);
  const rows = [];
  [...map.keys()].sort((a, b) => a - b).forEach(rd => {
    map.get(rd).forEach(e => {
      if (e.cat === 'lunar' && !S.query) return;
      if (e.cat === 'ekadashi' && !S.query) return;
      if (S.query && !(e.name + ' ' + (e.bn || '')).toLowerCase().includes(S.query.toLowerCase())) return;
      rows.push({ rd, e });
    });
  });
  return `<div class="card">
    <header><h2>Observances in ${y}</h2>
      <button id="ics" style="margin-left:auto;border:1px solid var(--line);background:var(--panel2);
        border-radius:8px;padding:5px 10px;font-size:12px">Export .ics</button></header>
    <div class="searchbar"><input id="q" placeholder="Search — try purnima, ekadashi, puja…" value="${esc(S.query)}"></div>
    <div class="flist">${rows.map(r => {
      const b = bengaliDate(r.rd);
      return `<div class="frow" data-rd="${r.rd}">
        <span><span class="d">${gstr(r.rd)}</span><br><span class="b bn">${bnNum(b.day)} ${b.month.bn}</span></span>
        <span><span class="dot ${r.e.cat}" style="display:inline-block;margin-right:6px"></span>${esc(r.e.name)}
          ${r.e.approx ? '<span class="tag">approx</span>' : ''}</span>
        <span>${r.e.holiday ? `<span class="tag ${r.e.holiday === 'gazetted' ? 'gaz' : 'wb'}">${r.e.holiday === 'gazetted' ? 'Gazetted' : 'WB'}</span>` : ''}</span>
      </div>`; }).join('') || '<div class="body" style="color:var(--ink2)">Nothing matches.</div>'}</div></div>`;
}

function footer() {
  return `<footer>
  <b>How this is computed.</b> Everything on this page is calculated in your browser from first principles — no stored date tables, so any year works.
  Sun and moon positions come from a truncated ELP/VSOP series with the Lahiri (Chitrapaksha) ayanamsa for the <i>drik</i> engine, and from the
  Surya Siddhanta's own analytic model for the <i>Gupta Press</i> engine. Sunrise and sunset use the NOAA solar position algorithm;
  moonrise and moonset are found by scanning the moon's altitude, so they are good to a minute or two.<br>
  <b>Bengali date rule.</b> A civil day belongs to the solar month the sun occupies at sunset of the previous day. This reproduces the printed panjika
  (1 Boishakh 1432 = 15 Apr 2025, 1 Ashshin 1432 = 18 Sep 2025, 1 Srabon 1433 = 18 Jul 2026).<br>
  <b>Festival rules.</b> Pujas are matched by lunar month, paksha and tithi — at sunrise for day pujas, at forenoon for purvahna-vyapini ones
  (Saraswati, Jagaddhatri), and at midnight for night pujas (Kali Puja, Shivaratri, Kojagari Lakshmi). Islamic dates use the tabular calendar and
  will move by a day or two with local moon sighting. The West Bengal government publishes its holiday list each year — treat the tags here as indicative.<br>
  <b>Which reckoning.</b> The default <i>drik ganita</i> engine follows the Bisuddha Siddhanta tradition. It has been checked against published Bengali calendars for
  2023–2027 and agrees on 89 of 89 test dates, and its tithi start and end times land within a minute or two of a printed Bisuddhasiddhanta panjika
  (Kaushiki Amavasya 2025: this page 22 Aug 11:56 – 23 Aug 11:36, panjika 11:58 – 11:37).
  The <i>Surya Siddhanta</i> engine is the raw traditional model. It is close to, but not the same as, the printed Gupta Press panjika, which applies bija corrections this
  does not reproduce — expect it to run roughly half an hour early on tithi timings and to disagree on a couple of dates a year. Use it to see where the two traditions part,
  not as a substitute for a Gupta Press almanac. Where they differ on a date, the day panel says so.<br>
  <b>Keyboard.</b> Arrow keys move a day or a week, <b>T</b> jumps to today. <b>Export .ics</b> puts the year's observances into any phone or desktop calendar.
  </footer>`;
}

/* ---------------- events ---------------- */
function wire() {
  document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => {
    let m = S.viewM + (+b.dataset.nav);
    S.viewY += Math.floor(m / 12); S.viewM = mod(m, 12); render();
  });
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => { S.view = b.dataset.view; render(); });
  document.querySelectorAll('.cell,[data-rd]').forEach(c => c.addEventListener('click', () => {
    const rd = +c.dataset.rd; if (!rd) return;
    S.rd = rd; const g = rdToGreg(rd); S.viewY = g.y; S.viewM = g.m - 1; render();
    if (window.matchMedia('(max-width:900px)').matches)
      window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
  /* swipe left / right to change month on touch devices */
  const grid = document.querySelector('.grid');
  if (grid) {
    let x0 = null, y0 = null;
    grid.addEventListener('touchstart', ev => { x0 = ev.touches[0].clientX; y0 = ev.touches[0].clientY; }, { passive: true });
    grid.addEventListener('touchend', ev => {
      if (x0 === null) return;
      const dx = ev.changedTouches[0].clientX - x0, dy = ev.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx)) return;
      const dir = dx < 0 ? 1 : -1;
      if (S.view === 'bmonth') {
        const b = bengaliDate(S.rd);
        const nb = bengaliDate(dir > 0 ? b.monthEnd + 1 : b.monthStart - 1);
        S.rd = Math.min(nb.monthStart + b.day - 1, nb.monthEnd);
      } else {
        const m = S.viewM + dir; S.viewY += Math.floor(m / 12); S.viewM = mod(m, 12);
        S.rd = gregToRD(S.viewY, S.viewM + 1, Math.min(rdToGreg(S.rd).d, 28));
      }
      const g = rdToGreg(S.rd); S.viewY = g.y; S.viewM = g.m - 1; render();
    }, { passive: true });
  }
  const t = document.getElementById('btnToday');
  if (t) t.onclick = () => { S.rd = todayRD(); const g = rdToGreg(S.rd); S.viewY = g.y; S.viewM = g.m - 1; S.view = 'month'; render(); };
  const dp = document.getElementById('dpick');
  if (dp) dp.onchange = () => {
    const [y, m, d] = dp.value.split('-').map(Number);
    if (y) { S.rd = gregToRD(y, m, d); S.viewY = y; S.viewM = m - 1; render(); }
  };
  const en = document.getElementById('engine');
  if (en) en.onchange = () => { S.engine = en.value; evCache.clear(); render(); };
  const lc = document.getElementById('loc');
  if (lc) lc.onchange = () => { S.loc = +lc.value; evCache.clear(); render(); };
  const th = document.getElementById('theme');
  if (th) th.onclick = () => { S.theme = S.theme === 'light' ? 'dark' : 'light'; try { localStorage.setItem('bp-theme', S.theme); } catch (e) {} render(); };
  document.querySelectorAll('[data-bnav]').forEach(bt => bt.onclick = () => {
    const b = bengaliDate(S.rd);
    const nrd = +bt.dataset.bnav > 0 ? b.monthEnd + 1 : b.monthStart - 1;
    const nb = bengaliDate(nrd);
    S.rd = Math.min(nb.monthStart + b.day - 1, nb.monthEnd);
    const g = rdToGreg(S.rd); S.viewY = g.y; S.viewM = g.m - 1; render();
  });
  const ics = document.getElementById('ics');
  if (ics) ics.onclick = () => exportICS(S.viewY);
  const q = document.getElementById('q');
  if (q) {
    q.oninput = () => { S.query = q.value; const list = document.querySelector('.flist'); if (list) { render(); const nq = document.getElementById('q'); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); } };
  }
  document.onkeydown = e => {
    if (e.target.tagName === 'INPUT') return;
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) { e.preventDefault(); S.rd += step; const g = rdToGreg(S.rd); S.viewY = g.y; S.viewM = g.m - 1; render(); }
    if (e.key === 't' || e.key === 'T') { S.rd = todayRD(); const g = rdToGreg(S.rd); S.viewY = g.y; S.viewM = g.m - 1; render(); }
  };
}

/* ---------------- ICS export ---------------- */
function exportICS(y) {
  const map = eventsFor(y);
  const pad = n => String(n).padStart(2, '0');
  const stamp = rd => { const g = rdToGreg(rd); return `${g.y}${pad(g.m)}${pad(g.d)}`; };
  let out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Bengali Panjika//EN', 'CALSCALE:GREGORIAN',
             'X-WR-CALNAME:Bengali Panjika ' + y];
  [...map.keys()].sort((a, b) => a - b).forEach(rd => {
    map.get(rd).forEach((e, i) => {
      if (e.cat === 'lunar' || e.cat === 'solar') return;
      const bd = bengaliDate(rd);
      const desc = [`${bd.day} ${bd.month.en} ${bd.year} BS`, e.note || '', e.holiday ? (e.holiday === 'gazetted' ? 'Gazetted holiday' : 'West Bengal holiday') : '']
        .filter(Boolean).join(' — ').replace(/[,;\\]/g, m => '\\' + m);
      out.push('BEGIN:VEVENT',
        `UID:${stamp(rd)}-${i}-panjika@local`,
        `DTSTART;VALUE=DATE:${stamp(rd)}`,
        `DTEND;VALUE=DATE:${stamp(rd + 1)}`,
        `SUMMARY:${e.name.replace(/[,;\\]/g, m => '\\' + m)}`,
        `DESCRIPTION:${desc}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    });
  });
  out.push('END:VCALENDAR');
  const blob = new Blob([out.join('\r\n')], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `bengali-panjika-${y}.ics`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------------- boot ---------------- */
function boot() {
  try { S.theme = localStorage.getItem('bp-theme') || 'light'; } catch (e) {}
  S.rd = todayRD();
  const g = rdToGreg(S.rd); S.viewY = g.y; S.viewM = g.m - 1;
  render();
}
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', boot);
