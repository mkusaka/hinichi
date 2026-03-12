import type { AISummaryResult, HatenaEntry, Category } from "./types";
import { CATEGORIES, CATEGORY_LABELS } from "./types";

interface RenderOptions {
  summary?: AISummaryResult;
  currentFormat: string;
  currentSummary?: string;
  currentDate: string;
}

export function renderHtmlPage(
  entries: HatenaEntry[],
  category: Category,
  dateStr: string,
  options: RenderOptions,
): string {
  const label = CATEGORY_LABELS[category];
  const title = `HINICHI — ${label} — ${dateStr}`;
  const hotentryUrl = `https://b.hatena.ne.jp/hotentry/${category}/${dateStr.replace(/-/g, "")}`;
  const maxUsers = Math.max(...entries.map((e) => e.users), 1);

  const summarySection = options.summary ? buildSummarySection(options.summary) : "";
  const splash = entries.length > 0 ? buildSplash(entries[0], maxUsers) : "";
  const cards = entries
    .slice(1)
    .map((entry, index) => buildCard(entry, index, maxUsers))
    .join("\n");

  const categoryOptions = CATEGORIES.map(
    (c) =>
      `<option value="${c}"${c === category ? " selected" : ""}>${esc(CATEGORY_LABELS[c])}</option>`,
  ).join("");
  const formatOptions = ["html", "rss", "atom", "json"]
    .map(
      (f) =>
        `<option value="${f}"${f === options.currentFormat ? " selected" : ""}>${f.toUpperCase()}</option>`,
    )
    .join("");
  const summaryOptions = [
    { value: "", label: "OFF" },
    { value: "ai", label: "AI" },
    { value: "aiOnly", label: "AI ONLY" },
  ]
    .map(
      (s) =>
        `<option value="${s.value}"${s.value === (options.currentSummary || "") ? " selected" : ""}>${s.label}</option>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>${buildCss()}</style>
</head>
<body>
<canvas id="voidBg" aria-hidden="true"></canvas>
<div class="grain" aria-hidden="true"></div>
<div class="scroll-line" aria-hidden="true"></div>
<div id="cursorGlow" aria-hidden="true"></div>
${buildSvgFilters()}

<header class="topbar">
  <a href="${escapeAttr(hotentryUrl)}" class="topbar-source">${esc(label)} <span class="topbar-date">${esc(dateStr)}</span></a>
  <nav class="topbar-controls">
    <select id="sel-category">${categoryOptions}</select>
    <input type="date" id="sel-date" value="${dateStr}" />
    <select id="sel-format">${formatOptions}</select>
    <select id="sel-summary">${summaryOptions}</select>
    <button id="btn-revalidate" title="revalidate">&#x21bb;</button>
  </nav>
</header>

${splash}
${summarySection}

<main class="magazine">
${cards}
</main>

<footer>
  <span class="footer-brand">HINICHI</span>
  <span class="footer-sub">はてなブックマーク デイリーダイジェスト</span>
</footer>

<script type="module" src="/client.js"></script>
</body>
</html>`;
}

/* ── Splash: full-viewport hero for #1 article ── */

function buildSplash(entry: HatenaEntry, maxUsers: number): string {
  const userPercentage = Math.round((entry.users / maxUsers) * 100);
  const imageHtml = entry.imageUrl
    ? `<img class="splash-img" src="${escapeAttr(entry.imageUrl)}" alt="" />`
    : "";
  const noImageClass = entry.imageUrl ? "" : " splash--no-image";
  const tags =
    entry.tags.length > 0
      ? `<div class="tags">${entry.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}</div>`
      : "";

  return `<section class="splash${noImageClass}">
  ${imageHtml}
  <div class="splash-overlay">
    <div class="splash-brand" aria-hidden="true">HINICHI</div>
    <div class="splash-content">
      <div class="splash-rank" aria-hidden="true">01</div>
      <div class="card-meta">
        <span class="users-badge">${entry.users} users</span>
        <span class="meta-dot">&middot;</span>
        <span class="domain-label">${esc(entry.domain)}</span>
      </div>
      <div class="pop-bar"><div class="pop-fill" style="width:${userPercentage}%"></div></div>
      <h1 class="splash-title"><a href="${escapeAttr(entry.url)}">${esc(entry.title)}</a></h1>
      ${entry.description ? `<p class="splash-desc">${esc(entry.description)}</p>` : ""}
      ${tags}
    </div>
  </div>
  <div class="splash-cut" aria-hidden="true"></div>
</section>`;
}

/* ── Card: magazine grid entry ── */

function buildCard(entry: HatenaEntry, index: number, maxUsers: number): string {
  const rank = String(index + 2).padStart(2, "0");
  const userPercentage = Math.round((entry.users / maxUsers) * 100);
  const imageHtml = entry.imageUrl
    ? `<div class="card-visual"><img src="${escapeAttr(entry.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()" /></div>`
    : "";
  const tags =
    entry.tags.length > 0
      ? `<div class="tags">${entry.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}</div>`
      : "";

  return `<article class="card">
  <div class="card-rank" aria-hidden="true">${rank}</div>
  ${imageHtml}
  <div class="card-body">
    <div class="card-meta">
      <span class="users-badge">${entry.users} users</span>
      <span class="meta-dot">&middot;</span>
      <span class="domain-label">${esc(entry.domain)}</span>
    </div>
    <div class="pop-bar"><div class="pop-fill" style="width:${userPercentage}%"></div></div>
    <h2><a href="${escapeAttr(entry.url)}">${esc(entry.title)}</a></h2>
    ${entry.description ? `<p>${esc(entry.description)}</p>` : ""}
    ${tags}
  </div>
</article>`;
}

/* ── Summary section ── */

function buildSummarySection(summary: AISummaryResult): string {
  const articleList = summary.articles
    .map(
      (a) =>
        `<li><a href="${escapeAttr(a.url)}">${esc(a.title)}</a><span class="article-summary">&mdash; ${esc(a.summary)}</span></li>`,
    )
    .join("\n      ");
  const copyText = buildCopyText(summary);
  return `<section class="summary">
  <div class="summary-header">
    <h2>Summary</h2>
    <button class="copy-btn" data-copy-text="${escapeAttr(copyText)}">COPY</button>
  </div>
  <div class="overview">${esc(summary.overview)}</div>
  <h3>Articles</h3>
  <ul>${articleList}</ul>
</section>`;
}

function buildCopyText(summary: AISummaryResult): string {
  const lines = [summary.overview, ""];
  for (const a of summary.articles) {
    lines.push(`- ${a.title}: ${a.summary}`);
    lines.push(`  ${a.url}`);
  }
  return lines.join("\n");
}

/* ── Inline SVG filters ── */

function buildSvgFilters(): string {
  return `<svg style="position:absolute;width:0;height:0" aria-hidden="true">
  <defs>
    <filter id="chromatic" x="-10%" y="-10%" width="120%" height="120%">
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
      <feOffset in="red" dx="4" dy="0" result="red-shifted"/>
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
      <feColorMatrix in="SourceGraphic" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
      <feOffset in="blue" dx="-4" dy="0" result="blue-shifted"/>
      <feBlend in="red-shifted" in2="green" mode="screen" result="rg"/>
      <feBlend in="rg" in2="blue-shifted" mode="screen"/>
    </filter>
  </defs>
</svg>`;
}

/* ── Error page ── */

interface ErrorPageOptions {
  details?: string[];
  linkHref?: string;
  linkLabel?: string;
}

export function renderErrorPage(
  message: string,
  dateStr: string,
  category: Category,
  options: ErrorPageOptions = {},
): string {
  const label = CATEGORY_LABELS[category];
  const details = options.details ?? [
    `${label} カテゴリの ${dateStr} のエントリーが見つかりませんでした。`,
    "日付を変更するか、別のカテゴリをお試しください。",
  ];
  const linkHref = options.linkHref ?? `/${category}?format=html`;
  const linkLabel = options.linkLabel ?? "最新のエントリーを見る";
  const detailsHtml = details.map((line) => `<p>${esc(line)}</p>`).join("\n      ");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HINICHI &mdash; ERROR</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>${buildCss()}</style>
</head>
<body>
<canvas id="voidBg" aria-hidden="true"></canvas>
<div class="grain" aria-hidden="true"></div>

<div class="err-wrap">
  <div class="err-brand" aria-hidden="true">HINICHI</div>
  <div class="err-box">
    <div class="err-label">ERROR</div>
    <h2>${esc(message)}</h2>
    ${detailsHtml}
    <p><a href="${escapeAttr(linkHref)}">${esc(linkLabel)} &rarr;</a></p>
  </div>
</div>

<script type="module" src="/client.js"></script>
</body>
</html>`;
}

/* ── CSS ── */

function buildCss(): string {
  return `
/* ── Theme ── */
:root {
  color-scheme: light dark;
  --bg: #f8f5f0;
  --surface: #eee9e2;
  --text: #1a1714;
  --text-muted: #8a8580;
  --text-dim: #c0bbb5;
  --accent: #1a6b5a;
  --accent-hot: #e04225;
  --border: #ddd8d0;
  --font-display: 'Syne', sans-serif;
  --font-mono: 'JetBrains Mono', 'Menlo', monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #08080a;
    --surface: #111114;
    --text: #e8e4df;
    --text-muted: #6b6560;
    --text-dim: #2e2a28;
    --accent: #beff3a;
    --accent-hot: #ff3a3a;
    --border: #222225;
  }
}

/* ── Reset ── */
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0 }
::selection { background: var(--accent); color: #000 }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
html { scroll-behavior: smooth }
body {
  font-family: var(--font-mono);
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ── Background layers ── */
#voidBg {
  position: fixed; inset: 0; z-index: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
@media (prefers-color-scheme: light) { #voidBg { opacity: 0.04 } }

.grain { position: fixed; inset: 0; pointer-events: none; z-index: 9998 }
.grain::before {
  content: "";
  position: absolute; inset: -50%;
  width: 200%; height: 200%;
  opacity: 0.035;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  animation: grain-shift 0.5s steps(4) infinite;
}
@keyframes grain-shift {
  0%  { transform: translate(0, 0) }
  25% { transform: translate(-2%, -4%) }
  50% { transform: translate(3%, 1%) }
  75% { transform: translate(-1%, 3%) }
}

.scroll-line {
  position: fixed; left: 0; top: 0;
  width: 3px; height: 0;
  background: var(--accent);
  z-index: 10001;
}

#cursorGlow {
  position: fixed; width: 300px; height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--accent), transparent 70%);
  pointer-events: none; z-index: 1;
  transform: translate(-50%, -50%);
  opacity: 0; transition: opacity 0.4s;
  mix-blend-mode: screen;
  filter: blur(50px);
}
@media (prefers-color-scheme: light) { #cursorGlow { display: none } }

/* ── @property for animated gradient ── */
@property --gradient-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

/* ── Topbar ── */
.topbar {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 100; height: 40px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 1.5rem;
  font-size: 0.7rem;
  background: rgba(248, 245, 240, 0.6);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
@media (prefers-color-scheme: dark) {
  .topbar {
    background: rgba(8, 8, 10, 0.6);
    border-bottom-color: rgba(255,255,255,0.06);
  }
}
.topbar-source {
  font-family: var(--font-mono);
  color: var(--text);
  text-decoration: none;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: color 0.15s;
}
.topbar-source:hover { color: var(--accent) }
.topbar-date { opacity: 0.5 }
.topbar-controls { display: flex; align-items: center; gap: 0.5rem }
.topbar select, .topbar input[type="date"] {
  font-family: var(--font-mono); font-size: 0.65rem;
  padding: 0.2rem 0.4rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  cursor: pointer; appearance: none;
}
.topbar select:focus, .topbar input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.topbar button {
  font-family: var(--font-mono); font-size: 0.75rem;
  padding: 0.15rem 0.4rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  cursor: pointer;
  transition: all 0.15s;
}
.topbar button:hover { border-color: var(--accent); color: var(--accent) }

/* ── Splash (full-viewport hero) ── */
.splash {
  position: relative;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  background: var(--surface);
}
.splash-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: cover; z-index: 0;
}
.splash-overlay {
  position: relative; z-index: 2;
  width: 100%;
  padding: 4rem 3rem;
  background: linear-gradient(
    to top,
    rgba(8,8,10,0.92) 0%,
    rgba(8,8,10,0.5) 50%,
    transparent 100%
  );
}
.splash--no-image .splash-overlay {
  background: linear-gradient(to top, var(--bg) 0%, transparent 100%);
}
.splash-brand {
  position: absolute;
  top: 40%; left: 50%;
  transform: translate(-50%, -50%);
  font-family: var(--font-display);
  font-size: clamp(6rem, 22vw, 20rem);
  font-weight: 800;
  color: #fff;
  opacity: 0.12;
  pointer-events: none; user-select: none;
  white-space: nowrap;
  letter-spacing: -0.03em;
  z-index: 1;
}
.splash-rank {
  font-family: var(--font-display);
  font-size: clamp(4rem, 10vw, 8rem);
  font-weight: 800;
  color: var(--accent);
  line-height: 1;
  opacity: 0.25;
  margin-bottom: 0.5rem;
}
.splash-title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4.5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.08;
  max-width: 800px;
  margin: 0.5rem 0;
}
.splash-title a { color: #fff; text-decoration: none; transition: opacity 0.2s }
.splash-title a:hover { opacity: 0.8 }
.splash-desc {
  color: rgba(255,255,255,0.5);
  font-size: 0.85rem;
  max-width: 600px;
  margin-top: 0.5rem;
}
.splash .card-meta { color: rgba(255,255,255,0.6) }
.splash .users-badge { color: var(--accent) }
.splash .domain-label { color: rgba(255,255,255,0.4) }
.splash .pop-bar { background: rgba(255,255,255,0.15); max-width: 300px }
.splash .tags span { color: rgba(255,255,255,0.4); border-color: rgba(255,255,255,0.15) }

/* Diagonal cut at splash bottom */
.splash-cut {
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 80px;
  background: var(--bg);
  clip-path: polygon(100% 0, 0% 100%, 100% 100%);
  z-index: 4;
}

/* Animated conic gradient overlay */
.splash::after {
  content: "";
  position: absolute; inset: 0;
  background: conic-gradient(
    from var(--gradient-angle) at 30% 70%,
    var(--accent) 0deg,
    var(--accent-hot) 120deg,
    transparent 240deg,
    var(--accent) 360deg
  );
  opacity: 0.08;
  mix-blend-mode: overlay;
  z-index: 1;
  animation: rotate-gradient 20s linear infinite;
}
@keyframes rotate-gradient { to { --gradient-angle: 360deg } }

/* ── Shared: meta, popularity, tags ── */
.card-meta {
  display: flex; gap: 0.5rem; align-items: center;
  font-size: 0.75rem;
}
.users-badge { font-weight: 700; color: var(--accent); letter-spacing: 0.04em }
.meta-dot { opacity: 0.4 }
.domain-label { color: var(--text-muted) }
.pop-bar {
  height: 2px;
  background: var(--border);
  margin: 0.4rem 0;
  max-width: 200px;
}
.pop-fill { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-hot)) }
.tags { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.6rem }
.tags span {
  font-size: 0.65rem;
  color: var(--text-muted);
  border: 1px solid var(--border);
  padding: 0.1rem 0.5rem;
  letter-spacing: 0.02em;
  transition: border-color 0.15s, color 0.15s;
}
.tags span:hover { border-color: var(--accent); color: var(--accent) }

/* ── Magazine grid ── */
.magazine {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border);
  position: relative; z-index: 1;
  max-width: 1400px;
  margin: 0 auto;
}

/* ── Card ── */
.card {
  background: var(--bg);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.card-rank {
  position: absolute;
  bottom: 0; right: 1rem;
  font-family: var(--font-display);
  font-size: clamp(4rem, 8vw, 7rem);
  font-weight: 800;
  color: var(--accent);
  opacity: 0.06;
  line-height: 1;
  pointer-events: none; user-select: none;
}
.card-visual { width: 100%; overflow: hidden }
.card-visual img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  display: block;
  transition: transform 0.6s cubic-bezier(0.23,1,0.32,1), filter 0.4s;
}
.card-visual:hover img {
  transform: scale(1.05);
  filter: url(#chromatic);
}
.card-body { padding: 1.5rem 2rem 2rem; flex: 1 }
.card h2 {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.3;
  margin: 0.4rem 0 0.25rem;
}
.card h2 a { color: var(--text); text-decoration: none; transition: color 0.15s }
.card h2 a:hover { color: var(--accent) }
.card p { font-size: 0.8rem; color: var(--text-muted); line-height: 1.6 }

/* Featured: first 2 cards = full-width horizontal splits */
.magazine > .card:nth-child(-n+2) {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 50vh;
}
.magazine > .card:nth-child(2) .card-visual { order: -1 }
.magazine > .card:nth-child(-n+2) .card-visual { height: 100% }
.magazine > .card:nth-child(-n+2) .card-visual img {
  height: 100%; aspect-ratio: auto;
}
.magazine > .card:nth-child(-n+2) .card-body {
  display: flex; flex-direction: column; justify-content: center;
  padding: 3rem;
}
.magazine > .card:nth-child(-n+2) h2 {
  font-size: clamp(1.3rem, 2.5vw, 2rem);
}
.magazine > .card:nth-child(-n+2) .card-rank {
  font-size: clamp(6rem, 12vw, 10rem);
  opacity: 0.04;
}

/* Rhythm break: every 5th regular card goes full-width */
.magazine > .card:nth-child(n+3):nth-child(5n+3) {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.magazine > .card:nth-child(n+3):nth-child(5n+3) .card-visual { height: 100% }
.magazine > .card:nth-child(n+3):nth-child(5n+3) .card-visual img {
  height: 100%; aspect-ratio: auto;
}
.magazine > .card:nth-child(n+3):nth-child(5n+3) .card-body {
  padding: 2.5rem;
  display: flex; flex-direction: column; justify-content: center;
}

/* ── Summary ── */
.summary {
  max-width: 900px;
  margin: 3rem auto;
  padding: 2.5rem;
  background: var(--surface);
  border: 2px solid var(--border);
  position: relative; z-index: 1;
}
.summary-header {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--accent);
}
.summary-header h2 {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.1em;
  color: var(--accent);
  font-weight: 700;
  text-transform: uppercase;
}
.copy-btn {
  font-family: var(--font-mono); font-size: 0.65rem;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border);
  padding: 0.2rem 0.6rem;
  cursor: pointer;
  transition: all 0.15s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.copy-btn:hover { border-color: var(--accent); color: var(--accent) }
.copy-btn.copied { border-color: #22c55e; color: #22c55e }
.summary .overview {
  font-size: 0.85rem; line-height: 1.8;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}
.summary h3 {
  font-family: var(--font-display);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  margin: 1.5rem 0 0.5rem;
}
.summary ul { list-style: none }
.summary li { padding: 0.5rem 0; border-bottom: 1px solid var(--border) }
.summary li:last-child { border-bottom: none }
.summary li a {
  color: var(--text); text-decoration: none;
  font-weight: 500; font-size: 0.82rem;
  transition: color 0.15s;
}
.summary li a:hover { color: var(--accent) }
.article-summary {
  display: block; font-size: 0.75rem;
  color: var(--text-muted); margin-top: 0.15rem;
}

/* ── Footer ── */
footer {
  text-align: center;
  padding: 4rem 2rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  position: relative; z-index: 1;
  background: var(--bg);
}
.footer-brand {
  font-family: var(--font-display);
  font-weight: 800; font-size: 1rem;
  color: var(--accent); opacity: 0.3;
  display: block; margin-bottom: 0.5rem;
}
.footer-sub { display: block }

/* ── Error page ── */
.err-wrap {
  position: relative; z-index: 1;
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 2rem; gap: 2rem;
}
.err-brand {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(3rem, 15vw, 10rem);
  color: var(--accent); opacity: 0.1;
}
.err-box {
  max-width: 500px; width: 100%;
  padding: 2.5rem;
  background: var(--surface);
  border: 2px solid var(--border);
}
.err-label {
  font-family: var(--font-display);
  font-size: 0.7rem; letter-spacing: 0.15em;
  color: var(--accent-hot);
  text-transform: uppercase;
  margin-bottom: 1rem;
}
.err-box h2 {
  font-family: var(--font-display);
  font-size: 1.1rem; font-weight: 700;
  color: var(--accent-hot);
  margin: 0 0 1rem;
}
.err-box p {
  font-size: 0.85rem; color: var(--text-muted);
  line-height: 1.7; margin: 0 0 0.5rem;
}
.err-box a { color: var(--accent); text-decoration: none; transition: opacity 0.15s }
.err-box a:hover { opacity: 0.75 }

/* ── Scroll-driven animations (progressive enhancement) ── */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .card {
      animation: card-reveal linear both;
      animation-timeline: view();
      animation-range: entry 5% entry 40%;
    }
    @keyframes card-reveal {
      from { opacity: 0; transform: translateY(60px); filter: blur(4px) }
      to { opacity: 1; transform: none; filter: blur(0) }
    }
  }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .topbar {
    height: auto; flex-wrap: wrap;
    padding: 0.4rem 1rem; gap: 0.3rem;
  }
  .topbar-source { flex: 1 1 100%; text-align: center }
  .topbar-controls {
    flex: 1 1 100%;
    justify-content: center; flex-wrap: wrap;
  }

  .splash { height: 85vh }
  .splash-overlay { padding: 2rem 1.5rem }
  .splash-brand { font-size: clamp(3rem, 18vw, 6rem) }
  .splash-title { font-size: clamp(1.4rem, 5vw, 2rem) }
  .splash-cut { height: 40px }

  .magazine { grid-template-columns: 1fr }
  .magazine > .card:nth-child(-n+2) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
  .magazine > .card:nth-child(-n+2) .card-visual img { aspect-ratio: 16 / 10 }
  .magazine > .card:nth-child(-n+2) .card-body { padding: 1.5rem }
  .magazine > .card:nth-child(n+3):nth-child(5n+3) { grid-template-columns: 1fr }

  .summary { margin: 2rem 1rem; padding: 1.5rem }
  .card-body { padding: 1.2rem 1.5rem }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .grain::before, .splash::after { animation: none }
  .card-visual img { transition: none }
}
`;
}

/* ── Escape helpers ── */

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
