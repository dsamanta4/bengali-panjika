#!/usr/bin/env python3
"""Bundle src/* into one self-contained HTML file."""
import pathlib, re, datetime

root = pathlib.Path(__file__).parent
src = root / 'src'

def js(name):
    t = (src / name).read_text(encoding='utf-8')
    return re.sub(r"\nif \(typeof module[\s\S]*$", "\n", t)

css = (src / 'style.css').read_text(encoding='utf-8')
code = "\n".join(js(f) for f in ['astro.js', 'calendar.js', 'festivals.js', 'ui.js'])

html = f"""<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bengali Panjika · বাংলা পঞ্জিকা</title>
<meta name="description" content="Bengali calendar with English dates, tithi, nakshatra, festivals and holidays, computed live for any year.">
<meta name="theme-color" content="#9c2f1f" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#15130f" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Panjika">
<meta name="format-detection" content="telephone=no">
<meta property="og:title" content="Bengali Panjika · বাংলা পঞ্জিকা">
<meta property="og:description" content="Bengali calendar with English dates, tithi, nakshatra, festivals and holidays. Computed live, works offline, any year.">
<meta property="og:type" content="website">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-192.png">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>&#128340;</text></svg>">
<style>
{css}
</style>
</head>
<body>
<div class="wrap"><div id="app"></div></div>
<script>
{code}
if ('serviceWorker' in navigator && location.protocol.startsWith('http'))
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {{}}));
</script>
</body>
</html>
"""
out = root / 'dist' / 'bengali-panjika.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(f"wrote {out}  ({len(html)/1024:.0f} KB)")
