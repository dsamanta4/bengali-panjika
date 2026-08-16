/* ============================================================
   astro.js — Surya Siddhanta (Gupta Press basis) + modern drik
   All angles in degrees. All "rd" values are Rata Die day numbers
   (RD 1 = 1 Jan 1 CE, proleptic Gregorian). Fractional rd = time
   of day in IST unless stated otherwise.
   ============================================================ */

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const sind = x => Math.sin(x * D2R);
const cosd = x => Math.cos(x * D2R);
const tand = x => Math.tan(x * D2R);
const asind = x => Math.asin(Math.max(-1, Math.min(1, x))) * R2D;
const acosd = x => Math.acos(Math.max(-1, Math.min(1, x))) * R2D;
const atan2d = (y, x) => Math.atan2(y, x) * R2D;
const mod = (a, b) => a - b * Math.floor(a / b);
const amod = (a, b) => b + mod(a, -b);           // 1..b instead of 0..b-1

/* ---------- calendar arithmetic ---------- */
const IST = 5.5 / 24;                             // India Standard Time offset in days

function gregToRD(y, m, d) {                      // proleptic Gregorian -> RD
  const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4)
            - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return jdn - 1721425;
}
function rdToGreg(rd) {                           // RD -> {y,m,d}
  let jdn = Math.floor(rd) + 1721425;
  let a = jdn + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor(146097 * b / 4);
  let dd = Math.floor((4 * c + 3) / 1461), e = c - Math.floor(1461 * dd / 4), mm = Math.floor((5 * e + 2) / 153);
  return { d: e - Math.floor((153 * mm + 2) / 5) + 1, m: mm + 3 - 12 * Math.floor(mm / 10), y: 100 * b + dd - 4800 + Math.floor(mm / 10) };
}
const rdToJD = rd => rd + 1721424.5;              // rd (UT) -> Julian Day
const jdToRD = jd => jd - 1721424.5;
const weekday = rd => mod(Math.floor(rd), 7);     // 0 = Sunday

function rdFromDate(dt) {                         // JS Date (local) -> rd, date part only
  return gregToRD(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

/* ============================================================
   1. SURYA SIDDHANTA  (basis of the Gupta Press / Bisuddha-
      siddhanta-adjacent traditional panjikas)
      Algorithm per Surya Siddhanta as formalised in
      Reingold & Dershowitz, "Calendrical Calculations".
   ============================================================ */

const SS = {
  EPOCH: -1132959,                                          // RD of Kali Yuga start
  SIDEREAL_YEAR: 365 + 279457 / 1080000,
  SIDEREAL_MONTH: 27 + 4644439 / 14438334,
  SYNODIC_MONTH: 29 + 7087771 / 13358334,
  ANOM_YEAR: 1577917828000 / (4320000000 - 387),
  ANOM_MONTH: 1577917828 / (57753336 - 488199),
  UJJAIN_LON: 75.7683,                                      // reference meridian of the siddhantas
};
SS.CREATION = SS.EPOCH - 1955880000 * SS.SIDEREAL_YEAR;
// IST (82.5E) -> Ujjain local mean time, in days
SS.TZ_SHIFT = (82.5 - SS.UJJAIN_LON) / 360;

/* 24-entry sine table of the Surya Siddhanta, radius 3438' */
function ssSineTable(entry) {
  const exact = 3438 * Math.sin(entry * 3.75 * D2R);
  const error = 0.215 * Math.sign(exact) * Math.sign(Math.abs(exact) - 1716);
  return Math.round(exact + error) / 3438;
}
function ssSine(theta) {
  const entry = theta / 3.75, frac = mod(entry, 1);
  return frac * ssSineTable(Math.ceil(entry)) + (1 - frac) * ssSineTable(Math.floor(entry));
}
function ssArcsin(amp) {
  if (amp < 0) return -ssArcsin(-amp);
  let pos = 0;
  while (amp > ssSineTable(pos)) pos++;
  const below = ssSineTable(pos - 1);
  return 3.75 * (pos - 1 + (amp - below) / (ssSineTable(pos) - below));
}
const ssMeanPos = (tee, period) => 360 * mod((tee - SS.CREATION) / period, 1);

function ssTruePos(tee, period, size, anom, change) {
  const lambda = ssMeanPos(tee, period);
  const offset = ssSine(ssMeanPos(tee, anom));
  const contraction = Math.abs(offset) * change * size;
  const equation = ssArcsin(offset * (size - contraction));
  return mod(lambda - equation, 360);
}
/* tee is an RD moment in IST; converted internally to Ujjain LMT */
const ssSunLon  = tee => ssTruePos(tee - SS.TZ_SHIFT, SS.SIDEREAL_YEAR,  14 / 360, SS.ANOM_YEAR,  1 / 42);
const ssMoonLon = tee => ssTruePos(tee - SS.TZ_SHIFT, SS.SIDEREAL_MONTH, 32 / 360, SS.ANOM_MONTH, 1 / 96);

/* ============================================================
   2. MODERN (drik) POSITIONS — Meeus, for the comparison mode,
      for moon phase/illumination and for rise/set times.
   ============================================================ */

function jcen(jd) { return (jd - 2451545.0) / 36525; }

/* Delta-T (TT - UT), seconds — full Espenak & Meeus polynomial set.
   Valid -500 to +2150; degrades to the parabolic long-term fit outside that. */
function deltaT(jd) {
  const y = 2000 + (jd - 2451545.0) / 365.25;
  const u = (y - 1820) / 100;
  let t;
  if (y < -500)  return -20 + 32 * u * u;
  if (y < 500)  { t = y / 100;
    return 10583.6 - 1014.41 * t + 33.78311 * t ** 2 - 5.952053 * t ** 3
         - 0.1798452 * t ** 4 + 0.022174192 * t ** 5 + 0.0090316521 * t ** 6; }
  if (y < 1600) { t = (y - 1000) / 100;
    return 1574.2 - 556.01 * t + 71.23472 * t ** 2 + 0.319781 * t ** 3
         - 0.8503463 * t ** 4 - 0.005050998 * t ** 5 + 0.0083572073 * t ** 6; }
  if (y < 1700) { t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t ** 2 + t ** 3 / 7129; }
  if (y < 1800) { t = y - 1700;
    return 8.83 + 0.1603 * t - 0.0059285 * t ** 2 + 0.00013336 * t ** 3 - t ** 4 / 1174000; }
  if (y < 1860) { t = y - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
         + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7; }
  if (y < 1900) { t = y - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3
         - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
  if (y < 1920) { t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t ** 2 + 0.0020936 * t ** 3; }
  if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547; }
  if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718; }
  if (y < 2005) { t = y - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3
         + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t ** 2; }
  if (y < 2150) return -20 + 32 * u * u - 0.5628 * (2150 - y);
  return -20 + 32 * u * u;
}
const toTT = jd => jd + deltaT(jd) / 86400;

/* Apparent geocentric longitude of the Sun (tropical), Meeus ch.25 */
function sunTropical(jd) {
  const T = jcen(jd);
  const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const C = sind(M) * (1.914602 - T * (0.004817 + 0.000014 * T))
          + sind(2 * M) * (0.019993 - 0.000101 * T) + sind(3 * M) * 0.000289;
  const trueLon = L0 + C;
  const om = 125.04 - 1934.136 * T;
  return { lon: mod(trueLon - 0.00569 - 0.00478 * sind(om), 360), M, T, om };
}
function obliquity(T, om) {
  const e0 = 23 + (26 + (21.448 - T * (46.8150 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  return e0 + 0.00256 * cosd(om);
}

/* Moon, truncated ELP (Meeus ch.47). ~0.1 deg in longitude. */
function moonTropical(jd) {
  const T = jcen(jd);
  const Lp = mod(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000, 360);
  const D  = mod(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000, 360);
  const M  = mod(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000, 360);
  const Mp = mod(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000, 360);
  const F  = mod(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000, 360);
  const A1 = mod(119.75 + 131.849 * T, 360), A2 = mod(53.09 + 479264.290 * T, 360), A3 = mod(313.45 + 481266.484 * T, 360);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  // terms: [D, M, Mp, F, sigmaL(1e-6 deg), sigmaR(1e-3 km)]
  const TL = [
    [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],
    [0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],
    [2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],
    [2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
    [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],
    [0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],
    [4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],
    [1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
    [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],
    [0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],
    [1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],
    [0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
    [2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],
    [3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],
    [0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],
    [2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
    [4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],
    [0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],
    [4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],
    [1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
  ];
  const TB = [
    [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],
    [2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],
    [2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],
    [2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],
    [2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
    [0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],
    [0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],
    [4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],
    [2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],
    [0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
    [2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],
    [0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],
    [0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],
    [0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],
    [4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
  ];
  let sl = 0, sr = 0, sb = 0;
  for (const t of TL) {
    const arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
    const ecc = Math.abs(t[1]) === 1 ? E : (Math.abs(t[1]) === 2 ? E * E : 1);
    sl += t[4] * ecc * sind(arg); sr += t[5] * ecc * cosd(arg);
  }
  for (const t of TB) {
    const arg = t[0] * D + t[1] * M + t[2] * Mp + t[3] * F;
    const ecc = Math.abs(t[1]) === 1 ? E : (Math.abs(t[1]) === 2 ? E * E : 1);
    sb += t[4] * ecc * sind(arg);
  }
  sl += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);
  sb += -2235 * sind(Lp) + 382 * sind(A3) + 175 * sind(A1 - F) + 175 * sind(A1 + F)
      + 127 * sind(Lp - Mp) - 115 * sind(Lp + Mp);
  return {
    lon: mod(Lp + sl / 1e6, 360),
    lat: sb / 1e6,
    dist: 385000.56 + sr / 1000,                 // km
    T
  };
}

/* Lahiri (Chitrapaksha) ayanamsa — good to a few arc-seconds over 1900–2100 */
function ayanamsaLahiri(jd) {
  const t = (jd - 2451545.0) / 36525;
  return 23.85231 + 1.3969713 * t + 0.0000305 * t * t;
}
const drikSunLon  = tee => { const j = rdToJD(tee - IST); return mod(sunTropical(toTT(j)).lon  - ayanamsaLahiri(j), 360); };
const drikMoonLon = tee => { const j = rdToJD(tee - IST); return mod(moonTropical(toTT(j)).lon - ayanamsaLahiri(j), 360); };

/* ============================================================
   3. RISE / SET / TWILIGHT for a given location
   ============================================================ */

/* NOAA sunrise/sunset. rd = civil date, returns rd-moment in IST (or null). */
function sunEvent(rd, lat, lon, tz, zenith, rising) {
  let jd = rdToJD(rd) + 0.5 - tz;                 // approx local noon in UT
  let res = null;
  for (let i = 0; i < 3; i++) {
    const T = jcen(jd);
    const L0 = mod(280.46646 + T * (36000.76983 + T * 0.0003032), 360);
    const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const C = sind(M) * (1.914602 - T * (0.004817 + 0.000014 * T))
            + sind(2 * M) * (0.019993 - 0.000101 * T) + sind(3 * M) * 0.000289;
    const om = 125.04 - 1934.136 * T;
    const appLon = L0 + C - 0.00569 - 0.00478 * sind(om);
    const eps = obliquity(T, om);
    const decl = asind(sind(eps) * sind(appLon));
    const y = tand(eps / 2) ** 2;
    const eqTime = 4 * R2D * (y * sind(2 * L0) - 2 * e * sind(M) + 4 * e * y * sind(M) * cosd(2 * L0)
                 - 0.5 * y * y * sind(4 * L0) - 1.25 * e * e * sind(2 * M));
    const cosH = (cosd(zenith) - sind(lat) * sind(decl)) / (cosd(lat) * cosd(decl));
    if (cosH > 1 || cosH < -1) return null;
    const H = acosd(cosH) * (rising ? 1 : -1);
    const minutes = 720 - 4 * (lon + H) - eqTime;  // minutes UT
    res = rd + minutes / 1440 + tz;
    jd = rdToJD(rd) + minutes / 1440;
  }
  return res;
}
const sunrise = (rd, L) => sunEvent(rd, L.lat, L.lon, L.tz, 90.833, true);
const sunset  = (rd, L) => sunEvent(rd, L.lat, L.lon, L.tz, 90.833, false);

/* Moon horizontal altitude at an rd-moment (local tz) */
function moonAltitude(tee, L) {
  const jd = rdToJD(tee - L.tz);
  const m = moonTropical(toTT(jd));
  const T = jcen(jd), om = 125.04 - 1934.136 * T, eps = obliquity(T, om);
  const ra = atan2d(sind(m.lon) * cosd(eps) - tand(m.lat) * sind(eps), cosd(m.lon));
  const dec = asind(sind(m.lat) * cosd(eps) + cosd(m.lat) * sind(eps) * sind(m.lon));
  const gmst = mod(280.46061837 + 360.98564736629 * (jd - 2451545.0)
              + 0.000387933 * T * T - T * T * T / 38710000, 360);
  const H = mod(gmst + L.lon - ra, 360);
  const alt = asind(sind(L.lat) * sind(dec) + cosd(L.lat) * cosd(dec) * cosd(H));
  const parallax = asind(6378.14 / m.dist);
  return alt - 0.5667 - 0.25 + parallax;          // refraction, semi-diameter, parallax
}
/* scan the local day in 20-min steps for moonrise / moonset */
function moonRiseSet(rd, L) {
  let rise = null, set = null, prev = moonAltitude(rd, L);
  const step = 1 / 72;
  for (let t = rd + step; t <= rd + 1 + 1e-9; t += step) {
    const cur = moonAltitude(t, L);
    if (prev < 0 && cur >= 0 && rise === null) rise = refineMoon(t - step, t, L, true);
    if (prev >= 0 && cur < 0 && set === null)  set  = refineMoon(t - step, t, L, false);
    prev = cur;
  }
  return { rise, set };
}
function refineMoon(a, b, L, rising) {
  for (let i = 0; i < 24; i++) {
    const m = (a + b) / 2, v = moonAltitude(m, L);
    if ((v < 0) === rising) a = m; else b = m;
  }
  return (a + b) / 2;
}

/* ============================================================
   4. MOON PHASE (modern — used for illumination graphics)
   ============================================================ */
function moonIllumination(tee) {
  const jd = toTT(rdToJD(tee - IST));
  const s = sunTropical(jd), m = moonTropical(jd);
  const elong = mod(m.lon - s.lon, 360);
  const phaseAngle = 180 - elong;                 // near enough for display
  const k = (1 + cosd(phaseAngle)) / 2;
  return { fraction: k, elongation: elong, waxing: elong < 180 };
}

if (typeof module !== 'undefined') module.exports = {
  D2R, R2D, sind, cosd, tand, asind, acosd, atan2d, mod, amod, IST,
  gregToRD, rdToGreg, rdToJD, jdToRD, weekday, rdFromDate,
  SS, ssSunLon, ssMoonLon, drikSunLon, drikMoonLon, ayanamsaLahiri,
  sunrise, sunset, sunEvent, moonRiseSet, moonAltitude, moonIllumination,
  sunTropical, moonTropical
};
