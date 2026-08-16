# Bengali Panjika · বাংলা পঞ্জিকা

A Bengali calendar that shows English dates alongside, computes the full panjika in your browser,
and works offline. No server, no dependencies, no stored date tables — so any year works.

**Live: `https://<your-username>.github.io/bengali-panjika/`**

---

## What it shows

**Three views.** English month grid, Bengali month grid (Boishakh to Choitro, with the Gregorian
date secondary), and a full-year overview.

**Every day.** Bangabda and Saka dates, tithi with start and end times, nakshatra, yoga, karana,
paksha, amanta lunar month, sunrise, sunset, day length, moonrise, moonset, moon illumination,
Rahu kal, sidereal positions of sun and moon on a rashi dial, and the sankranti moment when one
falls that day.

**Festivals as rules, not a date list.** The full Durga Puja cycle from Pitri Paksha and Mahalaya
to Bijoya Dashami, Kali Puja, Kojagari Lakshmi Puja, Jagaddhatri, Bhai Phonta, Chhath, Jamai Sasthi,
Saraswati, Dolyatra, Rathayatra and Bipattarini, Bishwakarma, Manasa, Kaushiki and Phalaharini
Amavasya, Poush Parbon, Charak and Neel, Nabanna, Itu and Kartik Puja, central gazetted holidays,
West Bengal state holidays, other faiths, all 24 named Ekadashis, every Purnima and Amavasya, and
each solar sankranti.

**Export.** One click writes the year's observances to an `.ics` file for any phone or desktop
calendar.

**Install it.** On Android or iOS, open the site and choose "Add to Home Screen". It then opens
full-screen and works with no connection.

## Rules used

**Bengali civil date.** A day belongs to the solar month the sun occupies at *sunset of the previous
day*. Verified against printed panjika: 1 Boishakh 1432 = 15 Apr 2025, 1 Ashshin 1432 = 18 Sep 2025,
1 Srabon 1433 = 18 Jul 2026, 1 Bhadro 1433 = 18 Aug 2026.

**Festivals.** Matched on amanta lunar month, paksha and tithi, evaluated at the moment the tradition
prescribes — sunrise for ordinary day pujas, purvahna for Saraswati, madhyahna for Ganesh Chaturthi,
Ram Navami and Jagaddhatri, aparahna for Bijoya Dashami, pradosh for Dhanteras and Chhath, and
nishita for Kali Puja, Shivaratri, Kaushiki Amavasya and Kojagari Lakshmi Puja. Kshaya tithis (one
that never reaches a sunrise) and vriddhi tithis (one that spans two) are both handled; vriddhi days
carry a note. Adhika masa is detected and excluded, as the tradition requires.

## Two engines

| Engine | What it is |
|---|---|
| **Drik ganita** (default) | Modern astronomical positions — truncated ELP for the moon, Meeus for the sun, Lahiri (Chitrapaksha) ayanamsa, with a ΔT correction. Follows the Bisuddha Siddhanta tradition. |
| **Surya Siddhanta** | The Surya Siddhanta's own analytic model, the classical basis of the traditional panjikas. |

Where the two put a date differently, the day panel says so.

## Accuracy

The drik engine agrees with published Bengali calendars on **89 of 89 test dates across 2023–2027**,
and its tithi boundaries land within a minute or two of a printed Bisuddhasiddhanta panjika — for
Kaushiki Amavasya 2025 it gives 22 Aug 11:56 to 23 Aug 11:36 against the panjika's 11:58 to 11:37.

It is also checked outside the modern window. 15 August 1947 comes out as 30 Srabon 1354, the date
printed on Independence Day records. Poila Boishakh drifts cleanly from 7 April in 1400 to 19 April in
2300, about one day per 62 years, which is what a sidereal year running against the Gregorian should do.
ΔT uses the full Espenak & Meeus polynomial set, so the useful range is roughly **1600 to 2200** with
graceful degradation beyond.

Known limits, stated plainly:

- The Surya Siddhanta engine is **not** the printed Gupta Press panjika. Gupta Press applies bija
  corrections this does not reproduce, so it runs roughly half an hour early on tithi timings and
  will disagree on a couple of dates a year. Treat it as the classical model, not as a substitute
  for a Gupta Press almanac.
- Where a tithi ends within two or three minutes of the prescribed moment, the date can go either
  way. Printed panjikas disagree with each other at that margin too.
- Islamic dates use the tabular calendar and are tagged `approx`. Actual observance follows local
  moon sighting and moves by a day or two.
- The West Bengal holiday list is published fresh each year and includes one-off additions. Holiday
  tags here are indicative, not official.

## Deploying your own copy

1. Create a public repository named `bengali-panjika` and push these files to `main`.
2. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site appears at `https://<your-username>.github.io/bengali-panjika/` in about a minute.

The GitHub Action in `.github/workflows/build.yml` rebuilds `index.html` from `src/` on every push,
so you only ever edit the source files.

## Rebuilding locally

```
python3 build.py && cp dist/bengali-panjika.html index.html
```

| File | What it does |
|---|---|
| `src/astro.js` | Surya Siddhanta and modern sun/moon positions, ΔT, sunrise/sunset, moonrise/moonset |
| `src/calendar.js` | Bengali solar date, tithi/nakshatra/yoga/karana, lunar month, Rahu kal |
| `src/festivals.js` | The festival and holiday rule table |
| `src/ui.js` | Views, charts, interaction, ICS export |
| `src/style.css` | Light and dark themes, responsive layout |
| `sw.js` | Offline cache. Bump `CACHE` when you redeploy. |

To add a festival, add one line to `FESTIVALS` in `src/festivals.js`.

## Licence

MIT. Use it, fork it, put it anywhere.
