/* ============================================================
   festivals.js — rule-driven festival / holiday engine
   Every entry is a RULE, so any year can be generated.
   cat:  puja | national | wb | observance | ekadashi | lunar | solar | other-faith
   ============================================================ */

/* --- helper predicates evaluated against a day-context object --- */
/* ctx = { rd, greg, bengali, lunar, tithiSunrise, pakshaSunrise, tithiNumSunrise,
           sankranti, isLastOfBnMonth, weekday } */

/* when: 'sunrise' (default) | 'purvahna' | 'madhyahna' | 'aparahna' | 'midnight' (nishita) */
const L = (month, paksha, tithi, when = 'sunrise') => ctx => {
  const s = ctx.at[when];
  return ctx.lunar.name === month && s.paksha === paksha && s.num === tithi && !ctx.lunar.adhika;
};
/* Kshaya-aware: normally the tithi prevailing at sunrise, but if that tithi never
   reaches a sunrise (kshaya) it is taken on the day it runs through the afternoon.
   Purnima and Amavasya observances need this. */
const LK = (month, paksha, tithi) => (ctx, get) => {
  if (ctx.lunar.name !== month || ctx.lunar.adhika) return false;
  const hit = s => s.paksha === paksha && s.num === tithi;
  if (hit(ctx.at.sunrise)) return true;
  const next = get(1);
  return hit(ctx.at.aparahna) && !hit(next.at.sunrise);
};
/* Prescribed-moment rule with a safe fallback: match the day whose `when` the tithi
   covers; if the tithi covers that moment on no day at all, take the sunrise day. */
const LW = (month, paksha, tithi, when) => (ctx, get) => {
  if (ctx.lunar.name !== month || ctx.lunar.adhika) return false;
  const hit = (c, w) => c.at[w].paksha === paksha && c.at[w].num === tithi;
  if (hit(ctx, when)) return true;
  if (!hit(ctx, 'sunrise')) return false;
  return !hit(get(-1), when) && !hit(get(1), when);
};
const BSOLAR = (mIdx, day) => ctx => ctx.bengali.monthIndex === mIdx && ctx.bengali.day === day;
const BLAST = mIdx => ctx => ctx.bengali.monthIndex === mIdx && ctx.bengali.day === ctx.bengali.monthLength;
const G = (m, d) => ctx => ctx.greg.m === m && ctx.greg.d === d;

const FESTIVALS = [
  /* ---------------- Bengali new year & solar markers ---------------- */
  { name: 'Poila Boishakh (Nabobarsho)', bn: 'পয়লা বৈশাখ · নববর্ষ', cat: 'puja', holiday: 'wb',
    note: 'Bengali New Year. Halkhata opened by traders.', test: BSOLAR(0, 1) },
  { name: 'Akshay Tritiya', bn: 'অক্ষয় তৃতীয়া', cat: 'puja', test: L('Vaishakha', 'Shukla', 3) },
  { name: 'Rabindra Jayanti', bn: 'রবীন্দ্র জয়ন্তী', cat: 'observance', holiday: 'wb',
    note: '25 Boishakh — Tagore’s birth anniversary.', test: BSOLAR(0, 25) },
  { name: 'Nazrul Jayanti', bn: 'নজরুল জয়ন্তী', cat: 'observance',
    note: '11 Jyaistha — Kazi Nazrul Islam’s birth anniversary.', test: BSOLAR(1, 11) },
  { name: 'Jamai Sasthi', bn: 'জামাই ষষ্ঠী', cat: 'puja', test: L('Jyaishtha', 'Shukla', 6) },
  { name: 'Bishwakarma Puja', bn: 'বিশ্বকর্মা পূজা', cat: 'puja', holiday: 'wb',
    note: 'Last day of Bhadro, on Kanya Sankranti. Workshops and factories.', test: BLAST(4) },
  { name: 'Kartik Puja / Kartik Sankranti', bn: 'কার্তিক পূজা', cat: 'puja',
    note: 'Last day of Kartik. Bansberia, Chinsurah and Katwa.', test: BLAST(6) },
  { name: 'Itu Puja begins', bn: 'ইতু পূজা', cat: 'puja',
    note: 'Established on Kartik Sankranti, then worshipped every Sunday of Ogrohayon and immersed on Ogrohayon Sankranti.',
    test: BLAST(6) },
  { name: 'Poush Sankranti / Makar Sankranti', bn: 'পৌষ সংক্রান্তি · মকর সংক্রান্তি', cat: 'puja',
    note: 'Last day of Poush. Pithe-puli, Gangasagar Mela, Tusu Parab in Jangalmahal.', test: BLAST(8) },
  { name: 'Nabanna', bn: 'নবান্ন', cat: 'observance',
    note: 'Harvest festival. 1 Ogrohayon is the Bangladesh convention; in West Bengal the day is chosen locally and varies by panjika and district.',
    test: BSOLAR(7, 1) },
  { name: 'Chaitra Sankranti / Charak Puja', bn: 'চৈত্র সংক্রান্তি · চড়ক পূজা', cat: 'puja',
    note: 'Last day of the Bengali year. Gajan and Charak.', test: BLAST(11) },
  { name: 'Neel Sasthi / Neel Puja', bn: 'নীল ষষ্ঠী', cat: 'puja',
    note: 'Day before Chaitra Sankranti.', test: ctx => ctx.bengali.monthIndex === 11 && ctx.bengali.day === ctx.bengali.monthLength - 1 },
  { name: 'Ambubachi begins', bn: 'অম্বুবাচী', cat: 'observance',
    note: 'Sun enters Ardra nakshatra. Kamakhya mela; sowing and worship paused for three days.',
    test: (ctx, get) => ctx.sunNakshatra === 5 && get(-1).sunNakshatra !== 5 },

  /* ---------------- Durga Puja cycle ---------------- */
  { name: 'Pitri Paksha begins (Purnima Shraddha)', bn: 'পিতৃপক্ষ আরম্ভ', cat: 'observance',
    test: LK('Bhadrapada', 'Shukla', 15) },
  { name: 'Mahalaya', bn: 'মহালয়া', cat: 'puja', holiday: 'wb',
    note: 'Amavasya ending Bhadrapada. Tarpan at the ghats; the last day of Pitri Paksha. Devi Paksha opens the next day.',
    test: LK('Bhadrapada', 'Krishna', 15) },
  { name: 'Durga Puja — Maha Chaturthi', bn: 'মহাচতুর্থী', cat: 'puja', holiday: 'wb', test: L('Ashwina', 'Shukla', 4) },
  { name: 'Durga Puja — Maha Panchami', bn: 'মহাপঞ্চমী', cat: 'puja', holiday: 'wb', test: L('Ashwina', 'Shukla', 5) },
  { name: 'Durga Puja — Maha Sasthi', bn: 'মহাষষ্ঠী', cat: 'puja', holiday: 'wb', test: L('Ashwina', 'Shukla', 6) },
  { name: 'Durga Puja — Maha Saptami', bn: 'মহাসপ্তমী', cat: 'puja', holiday: 'wb', test: L('Ashwina', 'Shukla', 7) },
  { name: 'Durga Puja — Maha Ashtami', bn: 'মহাষ্টমী', cat: 'puja', holiday: 'wb',
    note: 'Sandhi Puja at the junction of Ashtami and Navami.', test: L('Ashwina', 'Shukla', 8) },
  { name: 'Durga Puja — Maha Nabami', bn: 'মহানবমী', cat: 'puja', holiday: 'wb', test: L('Ashwina', 'Shukla', 9) },
  { name: 'Bijoya Dashami (Dussehra)', bn: 'বিজয়া দশমী', cat: 'puja', holiday: 'gazetted',
    note: 'Immersion, Sindoor Khela.', preferLater: true, test: LW('Ashwina', 'Shukla', 10, 'aparahna') },
  { name: 'Kojagari Lakshmi Puja', bn: 'কোজাগরী লক্ষ্মীপূজা', cat: 'puja', holiday: 'wb',
    test: LW('Ashwina', 'Shukla', 15, 'midnight') },
  { name: 'Dhanteras', bn: 'ধনতেরাস', cat: 'puja', test: LW('Ashwina', 'Krishna', 13, 'pradosh') },
  { name: 'Bhoot Chaturdashi / Naraka Chaturdashi', bn: 'ভূত চতুর্দশী', cat: 'puja',
    note: 'Fourteen lamps and fourteen greens on the evening of Chaturdashi.', test: LW('Ashwina', 'Krishna', 14, 'midnight') },
  { name: 'Kali Puja / Deepavali', bn: 'কালীপূজা · দীপাবলি', cat: 'puja', holiday: 'gazetted',
    note: 'Amavasya ending Ashwina.', test: LW('Ashwina', 'Krishna', 15, 'midnight') },
  { name: 'Annakut / Govardhan Puja', bn: 'অন্নকূট', cat: 'puja', holiday: 'wb', test: L('Kartika', 'Shukla', 1) },
  { name: 'Bhai Phonta / Bhai Dooj', bn: 'ভাইফোঁটা', cat: 'puja', holiday: 'wb', test: L('Kartika', 'Shukla', 2) },
  { name: 'Chhath Puja — Kharna', bn: 'ছট খরনা', cat: 'puja', holiday: 'wb', test: LW('Kartika', 'Shukla', 5, 'pradosh') },
  { name: 'Chhath Puja', bn: 'ছটপূজা', cat: 'puja', holiday: 'wb', test: LW('Kartika', 'Shukla', 6, 'pradosh') },
  { name: 'Jagaddhatri Puja', bn: 'জগদ্ধাত্রী পূজা', cat: 'puja',
    note: 'Chandannagar and Krishnanagar. A district closure rather than a state holiday.', test: LW('Kartika', 'Shukla', 9, 'madhyahna') },
  { name: 'Rash Purnima / Kartik Purnima', bn: 'রাস পূর্ণিমা', cat: 'puja', test: LK('Kartika', 'Shukla', 15) },
  { name: 'Guru Nanak Jayanti', bn: 'গুরু নানক জয়ন্তী', cat: 'other-faith', holiday: 'gazetted',
    test: LK('Kartika', 'Shukla', 15) },

  /* ---------------- rest of the lunar year ---------------- */
  { name: 'Ratanti Kali Puja', bn: 'রটন্তী কালীপূজা', cat: 'puja', test: LW('Pausha', 'Krishna', 14, 'midnight') },
  { name: 'Saraswati Puja / Vasant Panchami', bn: 'সরস্বতী পূজা', cat: 'puja', holiday: 'wb',
    note: 'Hate-khori for children.', test: LW('Magha', 'Shukla', 5, 'purvahna') },
  { name: 'Maghi Purnima', bn: 'মাঘী পূর্ণিমা', cat: 'lunar', test: LK('Magha', 'Shukla', 15) },
  { name: 'Maha Shivaratri', bn: 'মহাশিবরাত্রি', cat: 'puja', holiday: 'wb', test: LW('Magha', 'Krishna', 14, 'midnight') },
  { name: 'Harichand Thakur Jayanti / Matua Mahamela', bn: 'হরিচাঁদ ঠাকুরের জন্মতিথি', cat: 'observance', holiday: 'wb',
    note: 'Madhukrishna Trayodashi. Thakurnagar mela.', test: L('Phalguna', 'Krishna', 13) },
  { name: 'Dolyatra (Doljatra)', bn: 'দোলযাত্রা', cat: 'puja', holiday: 'wb',
    note: 'Falgun Purnima. Basanta Utsav at Santiniketan.', test: LK('Phalguna', 'Shukla', 15) },
  { name: 'Holi (Dhulandi)', bn: 'হোলি', cat: 'puja', holiday: 'wb', test: L('Phalguna', 'Krishna', 1) },
  { name: 'Basanti Puja — Ashtami / Ashokashtami', bn: 'বাসন্তী পূজা · অশোকাষ্টমী', cat: 'puja',
    note: 'Spring Durga Puja runs Saptami to Dashami; Ashtami is the principal day. Ashokashtami mela at Dakshineswar.',
    test: L('Chaitra', 'Shukla', 8) },
  { name: 'Annapurna Puja', bn: 'অন্নপূর্ণা পূজা', cat: 'puja', test: L('Chaitra', 'Shukla', 8) },
  { name: 'Basanti Puja — Nabami', bn: 'বাসন্তী নবমী', cat: 'puja', test: L('Chaitra', 'Shukla', 9) },
  { name: 'Ram Navami', bn: 'রামনবমী', cat: 'puja', holiday: 'wb', test: LW('Chaitra', 'Shukla', 9, 'madhyahna') },
  { name: 'Mahavir Jayanti', bn: 'মহাবীর জয়ন্তী', cat: 'other-faith', holiday: 'gazetted', test: L('Chaitra', 'Shukla', 13) },
  { name: 'Hanuman Jayanti', bn: 'হনুমান জয়ন্তী', cat: 'puja', test: LK('Chaitra', 'Shukla', 15) },
  { name: 'Buddha Purnima', bn: 'বুদ্ধ পূর্ণিমা', cat: 'other-faith', holiday: 'gazetted',
    test: LK('Vaishakha', 'Shukla', 15) },
  { name: 'Phalaharini Kali Puja', bn: 'ফলহারিণী কালীপূজা', cat: 'puja', test: LW('Jyaishtha', 'Krishna', 15, 'midnight') },
  { name: 'Ganga Dashahara', bn: 'গঙ্গা দশহরা', cat: 'puja', test: L('Jyaishtha', 'Shukla', 10) },
  { name: 'Snan Yatra', bn: 'স্নানযাত্রা', cat: 'puja', test: LK('Jyaishtha', 'Shukla', 15) },
  { name: 'Rathayatra', bn: 'রথযাত্রা', cat: 'puja', holiday: 'wb',
    note: 'Mahesh and Puri. Kolkata pandal bamboo goes up.', test: L('Ashadha', 'Shukla', 2) },
  { name: 'Bipattarini Puja', bn: 'বিপত্তারিণী পূজা', cat: 'puja',
    note: 'Saturday and Tuesday of Ashadha Shukla falling between Rathayatra and Ulto Rath.',
    test: ctx => ctx.lunar.name === 'Ashadha' && !ctx.lunar.adhika && ctx.pakshaSunrise === 'Shukla'
      && ctx.tithiNumSunrise >= 3 && ctx.tithiNumSunrise <= 9 && (ctx.weekday === 6 || ctx.weekday === 2) },
  { name: 'Ulto Rath (Punar Yatra)', bn: 'উল্টোরথ', cat: 'puja', test: L('Ashadha', 'Shukla', 10) },
  { name: 'Guru Purnima', bn: 'গুরুপূর্ণিমা', cat: 'puja', test: LK('Ashadha', 'Shukla', 15) },
  { name: 'Nag Panchami', bn: 'নাগপঞ্চমী', cat: 'puja', test: L('Shravana', 'Shukla', 5) },
  { name: 'Jhulan Purnima / Rakhi Bandhan', bn: 'ঝুলন পূর্ণিমা · রাখিবন্ধন', cat: 'puja', holiday: 'wb',
    test: LK('Shravana', 'Shukla', 15) },
  { name: 'Janmashtami', bn: 'জন্মাষ্টমী', cat: 'puja', holiday: 'wb', test: L('Shravana', 'Krishna', 8) },
  { name: 'Nandotsav', bn: 'নন্দোৎসব', cat: 'puja', test: L('Shravana', 'Krishna', 9) },
  { name: 'Kaushiki Amavasya', bn: 'কৌশিকী অমাবস্যা', cat: 'puja',
    note: 'Tarapith.', test: LW('Shravana', 'Krishna', 15, 'midnight') },
  { name: 'Manasa Puja', bn: 'মনসা পূজা', cat: 'puja', note: 'Last day of Srabon in much of rural Bengal.', test: BLAST(3) },
  { name: 'Ganesh Chaturthi', bn: 'গণেশ চতুর্থী', cat: 'puja', test: LW('Bhadrapada', 'Shukla', 4, 'madhyahna') },
  { name: 'Radhashtami', bn: 'রাধাষ্টমী', cat: 'puja', test: L('Bhadrapada', 'Shukla', 8) },

  /* ---------------- monthly lunar markers ---------------- */
  { name: 'Purnima', bn: 'পূর্ণিমা', cat: 'lunar', test: ctx => ctx.syzygy === 'purnima',
    label: ctx => 'Purnima — full moon' },
  { name: 'Amavasya', bn: 'অমাবস্যা', cat: 'lunar', test: ctx => ctx.syzygy === 'amavasya',
    label: ctx => 'Amavasya — new moon' },
  { name: 'Sankranti', bn: 'সংক্রান্তি', cat: 'solar',
    test: ctx => !!ctx.sankranti, label: ctx => `Sun enters ${ctx.sankranti.name} — ${ctx.sankranti.name} Sankranti` },

  /* ---------------- national / civic (Gregorian-fixed) ---------------- */
  { name: 'New Year’s Day', cat: 'observance', holiday: 'wb', test: G(1, 1) },
  { name: 'Swami Vivekananda Jayanti (National Youth Day)', cat: 'observance', holiday: 'wb', test: G(1, 12) },
  { name: 'Netaji Subhas Chandra Bose Jayanti', bn: 'নেতাজি জয়ন্তী', cat: 'national', holiday: 'wb', test: G(1, 23) },
  { name: 'Republic Day', bn: 'প্রজাতন্ত্র দিবস', cat: 'national', holiday: 'gazetted', test: G(1, 26) },
  { name: 'Thakur Panchanan Barma Jayanti', cat: 'observance', holiday: 'wb', test: G(2, 14) },
  { name: 'International Women’s Day', cat: 'observance', test: G(3, 8) },
  { name: 'Dr B. R. Ambedkar Jayanti', cat: 'national', holiday: 'gazetted', test: G(4, 14) },
  { name: 'May Day (Labour Day)', bn: 'মে দিবস', cat: 'national', holiday: 'wb', test: G(5, 1) },
  { name: 'Hul Diwas (Santhal Rebellion Day)', cat: 'observance', holiday: 'wb', test: G(6, 30) },
  { name: 'Bhanu Bhakta Jayanti', cat: 'observance', holiday: 'wb',
    note: 'West Bengal holiday in the Darjeeling hills.', test: G(7, 13) },
  { name: 'Independence Day', bn: 'স্বাধীনতা দিবস', cat: 'national', holiday: 'gazetted', test: G(8, 15) },
  { name: 'Teachers’ Day', cat: 'observance', test: G(9, 5) },
  { name: 'Vidyasagar Jayanti', cat: 'observance',
    note: 'School holiday in West Bengal rather than a state-office holiday.', test: G(9, 26) },
  { name: 'Gandhi Jayanti', bn: 'গান্ধী জয়ন্তী', cat: 'national', holiday: 'gazetted', test: G(10, 2) },
  { name: 'Christmas Day', bn: 'বড়দিন', cat: 'other-faith', holiday: 'gazetted', test: G(12, 25) },
];

/* ---- Ekadashi naming: Shukla uses the amanta month, Krishna uses the
        purnimanta month (= amanta index + 1) ---- */
const EKADASHI = {
  Chaitra:    { S: 'Kamada',      K: 'Papamochani' },
  Vaishakha:  { S: 'Mohini',      K: 'Varuthini' },
  Jyaishtha:  { S: 'Nirjala',     K: 'Apara' },
  Ashadha:    { S: 'Devshayani',  K: 'Yogini' },
  Shravana:   { S: 'Putrada (Pavitropana)', K: 'Kamika' },
  Bhadrapada: { S: 'Parsva (Parivartini)',  K: 'Aja (Annada)' },
  Ashwina:    { S: 'Papankusha',  K: 'Indira' },
  Kartika:    { S: 'Prabodhini (Devutthana)', K: 'Rama' },
  Agrahayana: { S: 'Mokshada',    K: 'Utpanna' },
  Pausha:     { S: 'Putrada',     K: 'Saphala' },
  Magha:      { S: 'Jaya',        K: 'Shattila' },
  Phalguna:   { S: 'Amalaki',     K: 'Vijaya' },
};

/* ---- Easter (Gregorian, Meeus/Butcher) ---- */
function easterRD(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return gregToRD(y, month, day);
}

/* ---- Tabular Islamic calendar (civil epoch); dates are indicative only,
        actual observance in India follows local moon sighting ---- */
const ISLAMIC_EPOCH = 227015;                    // RD of 1 Muharram AH 1
function islamicToRD(y, m, d) {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354
       + Math.floor((3 + 11 * y) / 30) + ISLAMIC_EPOCH - 1;
}
function islamicYearsOverlapping(gy) {
  const approx = Math.floor((gregToRD(gy, 1, 1) - ISLAMIC_EPOCH) / 354.3672) + 1;
  return [approx - 1, approx, approx + 1];
}
const ISLAMIC_DAYS = [
  { m: 1,  d: 1,  name: 'Islamic New Year (1 Muharram)', cat: 'other-faith' },
  { m: 1,  d: 10, name: 'Muharram (Ashura)', cat: 'other-faith', holiday: 'gazetted' },
  { m: 3,  d: 12, name: 'Milad-un-Nabi (Fateha-Dwaz-Daham)', cat: 'other-faith', holiday: 'gazetted' },
  { m: 8,  d: 15, name: 'Shab-e-Barat', cat: 'other-faith', holiday: 'wb' },
  { m: 9,  d: 1,  name: 'Ramzan begins', cat: 'other-faith' },
  { m: 7,  d: 27, name: 'Shab-e-Meraj', cat: 'other-faith' },
  { m: 9,  d: 27, name: 'Shab-e-Qadr', cat: 'other-faith' },
  { m: 10, d: 1,  name: 'Id-ul-Fitr', cat: 'other-faith', holiday: 'gazetted' },
  { m: 12, d: 10, name: 'Id-ul-Zuha (Bakrid)', cat: 'other-faith', holiday: 'gazetted' },
];

/* ============================================================
   Build the festival index for a Gregorian year
   ============================================================ */
function buildYearEvents(gy, ctxOf) {
  const events = new Map();                       // rd -> [event]
  const add = (rd, ev) => { if (!events.has(rd)) events.set(rd, []); events.get(rd).push(ev); };

  const start = gregToRD(gy, 1, 1), end = gregToRD(gy, 12, 31);

  let prevHit = new Set();
  for (let rd = start; rd <= end; rd++) {
    const ctx = ctxOf(rd);
    const hit = new Set();
    const get = off => ctxOf(rd + off);
    for (let fi = 0; fi < FESTIVALS.length; fi++) {
      const f = FESTIVALS[fi];
      if (f.preferLater && f.test(get(1), o => ctxOf(rd + 1 + o))) continue;
      if (f.test(ctx, get)) {
        hit.add(fi);
        const vriddhi = prevHit.has(fi) && f.cat !== 'lunar' && f.cat !== 'solar';
        add(rd, {
          name: f.label ? f.label(ctx) : f.name, bn: f.bn, cat: f.cat, holiday: f.holiday,
          note: [f.note, vriddhi ? 'This tithi runs across two sunrises (vriddhi), so it is listed on both days — Bengali panjikas usually keep the observance on the later one.' : ''].filter(Boolean).join(' '),
          vriddhi,
        });
      }
    }
    prevHit = hit;
    if (ctx.tithiNumSunrise === 11) {
      const pm = ctx.pakshaSunrise === 'Shukla' ? ctx.lunar.name : LUNAR_MONTHS[mod(ctx.lunar.index + 1, 12)];
      const nm = (EKADASHI[pm] || {})[ctx.pakshaSunrise === 'Shukla' ? 'S' : 'K'];
      add(rd, { name: (nm ? nm + ' ' : '') + 'Ekadashi', bn: 'একাদশী', cat: 'ekadashi' });
    }
  }

  /* Christian movable */
  const e = easterRD(gy);
  add(e - 47, { name: 'Shrove Tuesday', cat: 'other-faith' });
  add(e - 2,  { name: 'Good Friday', bn: 'গুড ফ্রাইডে', cat: 'other-faith', holiday: 'gazetted' });
  add(e - 1,  { name: 'Easter Saturday', cat: 'other-faith', holiday: 'wb',
                note: 'West Bengal sectional holiday for Christian employees.' });
  add(e,      { name: 'Easter Sunday', cat: 'other-faith' });

  /* Islamic (tabular approximation) */
  for (const ay of islamicYearsOverlapping(gy)) {
    for (const d of ISLAMIC_DAYS) {
      const rd = islamicToRD(ay, d.m, d.d);
      if (rd >= start && rd <= end)
        add(rd, { name: d.name, cat: d.cat, holiday: d.holiday, approx: true,
                  note: 'Tabular date — actual observance follows local moon sighting and may shift by a day or two.' });
    }
  }
  return events;
}

if (typeof module !== 'undefined') module.exports = { FESTIVALS, EKADASHI, easterRD, islamicToRD, buildYearEvents };
