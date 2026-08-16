/* ============================================================
   calendar.js — Bengali (Bangabda) solar calendar + panjika
   Depends on astro.js
   ============================================================ */

const KOLKATA = { name: 'Kolkata', lat: 22.5726, lon: 88.3639, tz: 5.5 / 24 };

/* ---------- name tables ---------- */
const BN_MONTHS = [
  { en: 'Boishakh',   bn: 'বৈশাখ',     rashi: 'Mesha'      },
  { en: 'Jyaistha',   bn: 'জ্যৈষ্ঠ',    rashi: 'Vrishabha'  },
  { en: 'Asharh',     bn: 'আষাঢ়',      rashi: 'Mithuna'    },
  { en: 'Srabon',     bn: 'শ্রাবণ',     rashi: 'Karka'      },
  { en: 'Bhadro',     bn: 'ভাদ্র',      rashi: 'Simha'      },
  { en: 'Ashwin',     bn: 'আশ্বিন',     rashi: 'Kanya'      },
  { en: 'Kartik',     bn: 'কার্তিক',    rashi: 'Tula'       },
  { en: 'Ogrohayon',  bn: 'অগ্রহায়ণ',  rashi: 'Vrishchika' },
  { en: 'Poush',      bn: 'পৌষ',       rashi: 'Dhanu'      },
  { en: 'Magh',       bn: 'মাঘ',       rashi: 'Makara'     },
  { en: 'Falgun',     bn: 'ফাল্গুন',    rashi: 'Kumbha'     },
  { en: 'Choitro',    bn: 'চৈত্র',      rashi: 'Meena'      },
];
const RASHI = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'];
const RASHI_BN = ['মেষ','বৃষ','মিথুন','কর্কট','সিংহ','কন্যা','তুলা','বৃশ্চিক','ধনু','মকর','কুম্ভ','মীন'];

/* amanta lunar months, index 0 = Chaitra */
const LUNAR_MONTHS = ['Chaitra','Vaishakha','Jyaishtha','Ashadha','Shravana','Bhadrapada',
                      'Ashwina','Kartika','Agrahayana','Pausha','Magha','Phalguna'];
const LUNAR_MONTHS_BN = ['চৈত্র','বৈশাখ','জ্যৈষ্ঠ','আষাঢ়','শ্রাবণ','ভাদ্র','আশ্বিন','কার্তিক','অগ্রহায়ণ','পৌষ','মাঘ','ফাল্গুন'];

const TITHI_NAMES = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami',
  'Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi'];
const TITHI_BN = ['প্রতিপদ','দ্বিতীয়া','তৃতীয়া','চতুর্থী','পঞ্চমী','ষষ্ঠী','সপ্তমী','অষ্টমী','নবমী','দশমী','একাদশী','দ্বাদশী','ত্রয়োদশী','চতুর্দশী'];

const NAKSHATRA = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya',
  'Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha',
  'Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha',
  'Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAKSHATRA_BN = ['অশ্বিনী','ভরণী','কৃত্তিকা','রোহিণী','মৃগশিরা','আর্দ্রা','পুনর্বসু','পুষ্যা','অশ্লেষা','মঘা',
  'পূর্বফাল্গুনী','উত্তরফাল্গুনী','হস্তা','চিত্রা','স্বাতী','বিশাখা','অনুরাধা','জ্যেষ্ঠা','মূলা','পূর্বাষাঢ়া',
  'উত্তরাষাঢ়া','শ্রবণা','ধনিষ্ঠা','শতভিষা','পূর্বভাদ্রপদ','উত্তরভাদ্রপদ','রেবতী'];

const YOGA = ['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti',
  'Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyana',
  'Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];

const KARANA_MOVABLE = ['Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti'];
const KARANA_FIXED = ['Shakuni','Chatushpada','Naga','Kimstughna'];

const WEEKDAYS = [
  { en: 'Sunday',    bn: 'রবিবার'    }, { en: 'Monday',   bn: 'সোমবার'   },
  { en: 'Tuesday',   bn: 'মঙ্গলবার'  }, { en: 'Wednesday',bn: 'বুধবার'   },
  { en: 'Thursday',  bn: 'বৃহস্পতিবার'}, { en: 'Friday',   bn: 'শুক্রবার'  },
  { en: 'Saturday',  bn: 'শনিবার'    },
];

/* ---------- engine selection ---------- */
/* 'ss'   = Surya Siddhanta  (Gupta Press family panjika)
   'drik' = modern drik-ganita (Bisuddha Siddhanta family panjika) */
let ENGINE = 'drik';
function setEngine(e) { ENGINE = e; _cache.clear(); }
const sunLon  = tee => ENGINE === 'ss' ? ssSunLon(tee)  : drikSunLon(tee);
const moonLon = tee => ENGINE === 'ss' ? ssMoonLon(tee) : drikMoonLon(tee);
const elong   = tee => mod(moonLon(tee) - sunLon(tee), 360);

const _cache = new Map();
function cached(key, fn) {
  if (_cache.has(key)) return _cache.get(key);
  const v = fn(); _cache.set(key, v); return v;
}
const sunriseAt = rd => cached('sr' + rd, () => sunrise(rd, LOC));
const sunsetAt  = rd => cached('ss' + rd, () => sunset(rd, LOC));
let LOC = KOLKATA;
function setLocation(l) { LOC = l; _cache.clear(); }

/* ---------- root finders (Newton, rates in deg/day) ---------- */
function crossing(fn, target, rate, guess) {
  let t = guess;
  for (let i = 0; i < 12; i++) {
    const diff = mod(target - fn(t) + 180, 360) - 180;
    t += diff / rate;
    if (Math.abs(diff) < 1e-7) break;
  }
  return t;
}
const tithiCross = (n, guess) => crossing(elong, mod(n * 12, 360), 12.190749, guess);
const nakCross   = (n, guess) => crossing(moonLon, mod(n * (360 / 27), 360), 13.176358, guess);
const yogaCross  = (n, guess) => crossing(t => mod(sunLon(t) + moonLon(t), 360), mod(n * (360 / 27), 360), 14.161856, guess);
const karanCross = (n, guess) => crossing(elong, mod(n * 6, 360), 12.190749, guess);
const sankrantiAt = (sign, guess) => crossing(sunLon, mod(sign * 30, 360), 0.985647, guess);

/* ============================================================
   Bengali solar date
   Rule used: a civil day belongs to the solar month that the Sun
   occupies at SUNSET OF THE PREVIOUS DAY.  Equivalently the month
   opens on the second day after a sankranti that happens after
   sunset, and on the first day after one that happens before
   sunset.  This reproduces the printed Bengali panjika (e.g.
   1 Boishakh 1432 = 15 Apr 2025, 1 Ashshin 1432 = 18 Sep 2025,
   1 Srabon 1433 = 18 Jul 2026).
   ============================================================ */
const rashiOfDay = rd => cached('rz' + rd + ENGINE, () => Math.floor(sunLon(sunsetAt(rd - 1)) / 30));

function bengaliMonthStart(rd) {
  const z = rashiOfDay(rd);
  let d = rd;
  // jump back roughly, then step
  while (rashiOfDay(d - 1) === z) d--;
  return d;
}
function bengaliDate(rd) {
  const z = rashiOfDay(rd);
  const start = bengaliMonthStart(rd);
  let end = start; while (rashiOfDay(end + 1) === z) end++;
  const g = rdToGreg(rd);
  const nyStart = poilaBoishakh(g.y);
  const year = rd >= nyStart ? g.y - 593 : g.y - 594;
  return {
    year, monthIndex: z, month: BN_MONTHS[z], day: rd - start + 1,
    monthLength: end - start + 1, monthStart: start, monthEnd: end,
    sakaYear: sakaYearOf(rd, g),
  };
}
function poilaBoishakh(gy) {
  // first day of Mesha in Gregorian year gy
  let rd = gregToRD(gy, 4, 10);
  while (rashiOfDay(rd) !== 0) rd++;
  return rd;
}
function sakaYearOf(rd, g) {
  // Saka new year = Chaitra 1 (Meena sankranti based, ~22 March)
  let r = gregToRD(g.y, 3, 18);
  while (rashiOfDay(r) !== 11) r++;
  return rd >= r ? g.y - 78 : g.y - 79;
}

/* ============================================================
   Panjika elements for a civil day
   ============================================================ */
function tithiAt(tee) {
  const e = elong(tee);
  const n = Math.floor(e / 12);                 // 0..29
  return { index: n, number: n + 1 };
}
function describeTithi(n) {                     // n = 0..29
  const paksha = n < 15 ? 'Shukla' : 'Krishna';
  const pakshaBn = n < 15 ? 'শুক্লপক্ষ' : 'কৃষ্ণপক্ষ';
  const k = n % 15;
  let en, bn;
  if (n === 14) { en = 'Purnima'; bn = 'পূর্ণিমা'; }
  else if (n === 29) { en = 'Amavasya'; bn = 'অমাবস্যা'; }
  else { en = TITHI_NAMES[k]; bn = TITHI_BN[k]; }
  return { paksha, pakshaBn, name: en, nameBn: bn, num: k + 1, index: n };
}

function karanaName(idx) {                      // idx = 0..59 within the lunar month
  if (idx === 0) return 'Kimstughna';
  if (idx >= 57) return KARANA_FIXED[idx - 57];
  return KARANA_MOVABLE[(idx - 1) % 7];
}

/* Sequence of a cyclic element covering the local day (sunrise->next sunrise) */
function spanSequence(rd, valueAt, crossFn, count, period) {
  const t0 = sunriseAt(rd), t1 = sunriseAt(rd + 1);
  const out = [];
  let cur = Math.floor(valueAt(t0) / period);
  let start = crossFn(cur, t0 - 0.5);
  if (start > t0) start = crossFn(cur, t0 - 1.2);
  let guard = 0;
  while (guard++ < 6) {
    const end = crossFn(cur + 1, start + period / 13);
    out.push({ index: mod(cur, count), start, end });
    if (end >= t1) break;
    cur = cur + 1; start = end;
  }
  return out;
}

function panjika(rd) {
  const sr = sunriseAt(rd), ss = sunsetAt(rd);
  const tSeq = spanSequence(rd, elong, (n, g) => tithiCross(n, g), 30, 12)
                 .map(s => ({ ...s, ...describeTithi(mod(s.index, 30)) }));
  const nSeq = spanSequence(rd, moonLon, (n, g) => nakCross(n, g), 27, 360 / 27)
                 .map(s => ({ ...s, name: NAKSHATRA[mod(s.index, 27)], nameBn: NAKSHATRA_BN[mod(s.index, 27)] }));
  const ySeq = spanSequence(rd, t => mod(sunLon(t) + moonLon(t), 360), (n, g) => yogaCross(n, g), 27, 360 / 27)
                 .map(s => ({ ...s, name: YOGA[mod(s.index, 27)] }));
  const kSeq = spanSequence(rd, elong, (n, g) => karanCross(n, g), 60, 6)
                 .map(s => ({ ...s, name: karanaName(mod(s.index, 60)) }));

  const bd = bengaliDate(rd);
  const lm = lunarMonth(rd);
  const g = rdToGreg(rd);
  const wd = weekday(rd);
  const mrs = moonRiseSet(rd, LOC);
  const illum = moonIllumination(sr);

  return {
    rd, greg: g, weekday: wd, weekdayName: WEEKDAYS[wd],
    bengali: bd, lunar: lm,
    sunrise: sr, sunset: ss, dayLength: ss - sr,
    moonrise: mrs.rise, moonset: mrs.set,
    illumination: illum,
    tithi: tSeq, nakshatra: nSeq, yoga: ySeq, karana: kSeq,
    rahukal: rahuKal(sr, ss, wd),
    sunLongitude: sunLon(sr), moonLongitude: moonLon(sr),
    rashiSun: RASHI[Math.floor(sunLon(sr) / 30)],
    rashiMoon: RASHI[Math.floor(moonLon(sr) / 30)],
    sankranti: sankrantiOnDay(rd),
  };
}

/* Light-weight context used by the festival rule engine */
function dayContext(rd) {
  return cached('ctx' + rd + ENGINE, () => {
    const sr = sunriseAt(rd), ss = sunsetAt(rd);
    const at = tee => { const t = describeTithi(Math.floor(elong(tee) / 12)); return { index: t.index, num: t.num, paksha: t.paksha }; };
    const t = at(sr);
    const purvahna = at(sr + (ss - sr) * 0.3);      // forenoon — purvahna-vyapini rules
    const madhyahna = at(sr + (ss - sr) * 0.5);
    const aparahna = at(sr + (ss - sr) * 0.7);
    const pradosh  = at(ss + (ss - sr) * 0.05);   // ~40 min after sunset
    const midnight = at(rd + 1);                    // nishita — night pujas
    return {
      rd, greg: rdToGreg(rd), weekday: weekday(rd),
      bengali: bengaliDate(rd), lunar: lunarMonth(rd),
      tithiIndexSunrise: t.index, tithiNumSunrise: t.num, pakshaSunrise: t.paksha,
      at: { sunrise: t, purvahna, madhyahna, aparahna, pradosh, midnight },
      sankranti: sankrantiOnDay(rd),
      syzygy: syzygyOnDay(rd),
      sunNakshatra: Math.floor(sunLon(sr) / (360 / 27)),
    };
  });
}

/* Exact full / new moon inside this civil day? */
function syzygyOnDay(rd) {
  const a = Math.floor(elong(rd) / 180), b = Math.floor(elong(rd + 1) / 180);
  if (a === b) return null;
  return mod(b, 2) === 1 ? 'purnima' : 'amavasya';
}

/* Rahu kal — 1/8 of daylight, slot depends on weekday */
const RAHU_SLOT = [7, 1, 6, 4, 5, 3, 2];        // Sun..Sat, 1-based slot
function rahuKal(sr, ss, wd) {
  const eighth = (ss - sr) / 8, s = RAHU_SLOT[wd] - 1;
  return { start: sr + s * eighth, end: sr + (s + 1) * eighth };
}

/* Is there a sankranti (solar ingress) inside this civil day? */
function sankrantiOnDay(rd) {
  const a = Math.floor(sunLon(rd) / 30), b = Math.floor(sunLon(rd + 1) / 30);
  if (a === b) return null;
  const sign = mod(a + 1, 12);
  return { sign, name: RASHI[sign], nameBn: RASHI_BN[sign], moment: sankrantiAt(sign, rd + 0.5) };
}

/* ---------- lunar (amanta) month, with adhika detection ---------- */
function newMoonBefore(tee) {
  let nm = crossing(elong, 0, 12.190749, tee - 14.77);
  let guard = 0;
  while (nm > tee && guard++ < 4) nm = crossing(elong, 0, 12.190749, nm - 29.53);
  guard = 0;
  while (tee - nm > 29.9 && guard++ < 4) nm = crossing(elong, 0, 12.190749, nm + 29.53);
  return nm;
}
function lunarMonth(rd) {
  const sr = sunriseAt(rd);
  const nm = newMoonBefore(sr);
  const next = crossing(elong, 0, 12.190749, nm + 29.53);
  const rashiNow = Math.floor(sunLon(nm) / 30);
  const adhika = rashiNow === Math.floor(sunLon(next) / 30);
  const idx = mod(rashiNow + 1, 12);
  return { index: idx, name: LUNAR_MONTHS[idx], nameBn: LUNAR_MONTHS_BN[idx], adhika, newMoon: nm, nextNewMoon: next };
}

if (typeof module !== 'undefined') module.exports = {
  KOLKATA, BN_MONTHS, RASHI, RASHI_BN, LUNAR_MONTHS, LUNAR_MONTHS_BN, TITHI_NAMES, NAKSHATRA, YOGA, WEEKDAYS,
  setEngine, setLocation, sunLon, moonLon, elong, sunriseAt, sunsetAt,
  bengaliDate, poilaBoishakh, panjika, lunarMonth, describeTithi, sankrantiAt, rashiOfDay,
  tithiCross, crossing, dayContext,
  get ENGINE() { return ENGINE; }
};
