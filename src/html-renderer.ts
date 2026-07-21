import type { AISummaryResult, HatenaEntry, Category } from "./types";
import { CATEGORIES, CATEGORY_LABELS } from "./types";

interface RenderOptions {
  summary?: AISummaryResult;
  currentFormat: string;
  currentSummary?: string;
  currentDate: string;
}

const CATEGORY_MARK: Record<Category, string> = {
  all: "総",
  general: "般",
  social: "世",
  economics: "経",
  life: "暮",
  knowledge: "学",
  it: "技",
  fun: "笑",
  entertainment: "藝",
  game: "戯",
};

const WEEKDAYS_JP = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function renderHtmlPage(
  entries: HatenaEntry[],
  category: Category,
  dateStr: string,
  options: RenderOptions,
): string {
  const label = CATEGORY_LABELS[category];
  const mark = CATEGORY_MARK[category];
  const title = `HINICHI — ${label} — ${dateStr}`;
  const hotentryUrl = `https://b.hatena.ne.jp/hotentry/${category}/${dateStr.replace(/-/g, "")}`;
  const dateBits = splitDate(dateStr);

  const summarySection = options.summary ? buildEditorNotes(options.summary) : "";
  const hero = entries.length > 0 ? buildHero(entries[0]) : buildEmptyHero();
  const rest = entries
    .slice(1)
    .map((entry, index) => buildListing(entry, index + 2))
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
    { value: "", label: "なし" },
    { value: "ai", label: "AI 要約" },
    { value: "aiOnly", label: "要約のみ" },
  ]
    .map(
      (s) =>
        `<option value="${s.value}"${s.value === (options.currentSummary || "") ? " selected" : ""}>${s.label}</option>`,
    )
    .join("");

  const restSection =
    entries.length > 1
      ? `<section class="roll" aria-label="本日の記事一覧">
  <div class="roll-eyebrow"><span>本日の見出し</span><span class="roll-count">${entries.length - 1} 件</span></div>
  <ol class="roll-list">
${rest}
  </ol>
</section>`
      : "";

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,144,700;0,144,900;1,144,700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@700;900&display=swap" rel="stylesheet">
<style>${buildCss()}</style>
</head>
<body>
<a class="skip-link" href="#main">本文へスキップ</a>

<header class="masthead">
  <div class="masthead-inner">
    <div class="masthead-left">
      <a href="/" class="wordmark" aria-label="HINICHI トップへ">
        <span class="wordmark-latin">Hinichi</span>
        <span class="wordmark-jp">日次</span>
      </a>
      <p class="tagline">はてなブックマーク デイリー・ジャーナル</p>
    </div>
    <div class="masthead-right">
      <div class="stamp" aria-label="カテゴリ ${esc(label)}">
        <span class="stamp-mark">${esc(mark)}</span>
        <span class="stamp-label">${esc(label)}</span>
      </div>
      <a href="${escapeAttr(hotentryUrl)}" class="date-block" title="はてなブックマークで見る">
        <span class="date-year">${dateBits.year}</span>
        <span class="date-md"><span class="date-m">${dateBits.month}</span><span class="date-sep">/</span><span class="date-d">${dateBits.day}</span></span>
        <span class="date-dow">${dateBits.dow}曜日</span>
      </a>
    </div>
  </div>

  <form class="controls" method="get" action="/${category}" aria-label="表示設定">
    <label class="ctrl">
      <span>カテゴリ</span>
      <select id="sel-category" name="category">${categoryOptions}</select>
    </label>
    <label class="ctrl">
      <span>発行日</span>
      <input type="date" id="sel-date" name="date" value="${dateStr}" />
    </label>
    <label class="ctrl">
      <span>形式</span>
      <select id="sel-format" name="format">${formatOptions}</select>
    </label>
    <label class="ctrl">
      <span>要約</span>
      <select id="sel-summary" name="summary">${summaryOptions}</select>
    </label>
    <button id="btn-revalidate" type="button" title="再取得">再取得</button>
  </form>

  <div class="masthead-rule" aria-hidden="true"></div>
</header>

<main id="main">
${hero}
${summarySection}
${restSection}
</main>

<footer class="colophon">
  <div class="colophon-inner">
    <span class="colophon-brand">HINICHI</span>
    <span class="colophon-sub">日次 / はてなブックマーク編纂</span>
    <span class="colophon-date">${esc(dateStr)}</span>
  </div>
</footer>

<script type="module" src="/client.js"></script>
</body>
</html>`;
}

function buildHero(entry: HatenaEntry): string {
  const figure = entry.imageUrl
    ? `<figure class="hero-figure">
    <img src="${escapeAttr(entry.imageUrl)}" alt="" loading="eager" onerror="this.parentElement.remove()" />
  </figure>`
    : "";
  const tags =
    entry.tags.length > 0
      ? `<ul class="tags">${entry.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`
      : "";

  return `<article class="hero${entry.imageUrl ? "" : " hero--no-image"}">
  ${figure}
  <div class="hero-text">
    <div class="hero-rank"><span class="rank-word">第</span><span class="rank-num">01</span><span class="rank-word">位</span></div>
    <h1 class="hero-title"><a href="${escapeAttr(entry.url)}">${esc(entry.title)}</a></h1>
    ${entry.description ? `<p class="hero-lead">${esc(entry.description)}</p>` : ""}
    <div class="hero-meta">
      <span class="users">${entry.users} users</span>
      <span class="sep" aria-hidden="true">·</span>
      <span class="domain">${esc(entry.domain)}</span>
    </div>
    ${tags}
  </div>
</article>`;
}

function buildEmptyHero(): string {
  return `<article class="hero hero--no-image">
  <div class="hero-text">
    <div class="hero-rank"><span class="rank-word">本日</span></div>
    <h1 class="hero-title">記事はありません</h1>
    <p class="hero-lead">日付やカテゴリを変えて再取得してください。</p>
  </div>
</article>`;
}

function buildListing(entry: HatenaEntry, rank: number): string {
  const rankStr = String(rank).padStart(2, "0");
  const thumb = entry.imageUrl
    ? `<div class="row-thumb"><img src="${escapeAttr(entry.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()" /></div>`
    : "";
  const tags =
    entry.tags.length > 0
      ? `<ul class="tags tags--small">${entry.tags
          .slice(0, 4)
          .map((t) => `<li>${esc(t)}</li>`)
          .join("")}</ul>`
      : "";
  return `    <li class="row">
      <span class="row-rank" aria-hidden="true">${rankStr}</span>
      <div class="row-body">
        <h2 class="row-title"><a href="${escapeAttr(entry.url)}">${esc(entry.title)}</a></h2>
        <div class="row-meta">
          <span class="users">${entry.users} users</span>
          <span class="sep" aria-hidden="true">·</span>
          <span class="domain">${esc(entry.domain)}</span>
        </div>
        ${entry.description ? `<p class="row-lead">${esc(entry.description)}</p>` : ""}
        ${tags}
      </div>
      ${thumb}
    </li>`;
}

function buildEditorNotes(summary: AISummaryResult): string {
  const articleList = summary.articles
    .map(
      (a) =>
        `<li><a href="${escapeAttr(a.url)}">${esc(a.title)}</a><span class="notes-summary">${esc(a.summary)}</span></li>`,
    )
    .join("\n      ");
  const copyText = buildCopyText(summary);
  return `<section class="notes" aria-label="編集後記">
  <div class="notes-head">
    <div class="notes-eyebrow">
      <span class="notes-kanji">編集後記</span>
      <span class="notes-latin">Editor&rsquo;s notes</span>
    </div>
    <button class="copy-btn" data-copy-text="${escapeAttr(copyText)}">全文をコピー</button>
  </div>
  <p class="notes-overview">${esc(summary.overview)}</p>
  <h3 class="notes-subhead">取り上げた記事</h3>
  <ol class="notes-list">${articleList}</ol>
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
  const mark = CATEGORY_MARK[category];
  const dateBits = splitDate(dateStr);
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
<title>HINICHI — 停刊のお知らせ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,144,700;0,144,900;1,144,700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@700;900&display=swap" rel="stylesheet">
<style>${buildCss()}</style>
</head>
<body>
<main class="err-wrap">
  <div class="err-stamp">
    <span class="err-stamp-mark">${esc(mark)}</span>
    <span class="err-stamp-label">${esc(label)}</span>
  </div>
  <div class="err-date">
    <span class="date-year">${dateBits.year}</span>
    <span class="date-md"><span class="date-m">${dateBits.month}</span><span class="date-sep">/</span><span class="date-d">${dateBits.day}</span></span>
  </div>
  <div class="err-box">
    <div class="err-eyebrow">停刊のお知らせ</div>
    <h1>${esc(message)}</h1>
    <div class="err-details">${detailsHtml}</div>
    <p class="err-link"><a href="${escapeAttr(linkHref)}">${esc(linkLabel)} →</a></p>
  </div>
</main>
<script type="module" src="/client.js"></script>
</body>
</html>`;
}

function splitDate(dateStr: string): {
  year: string;
  month: string;
  day: string;
  dow: string;
} {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) return { year: dateStr, month: "", day: "", dow: "" };
  const [, y, mo, d] = m;
  const dow = safeWeekday(Number(y), Number(mo), Number(d));
  return { year: y, month: mo, day: d, dow };
}

function safeWeekday(y: number, m: number, d: number): string {
  // Zeller-safe fallback: use UTC Date only when values look valid; no reliance on locale.
  if (!y || !m || !d) return "";
  const t = Date.UTC(y, m - 1, d);
  if (Number.isNaN(t)) return "";
  return WEEKDAYS_JP[new Date(t).getUTCDay()];
}

function buildCss(): string {
  return `
:root {
  color-scheme: light dark;
  --paper: #f2ece0;
  --paper-warm: #ebe4d5;
  --ink: #14192e;
  --ink-soft: #3a3f55;
  --sub: #8f8776;
  --dim: #b8b1a1;
  --rule: #d8d0be;
  --rule-strong: #b8ae97;
  --seal: #c8341e;
  --seal-ink: #ffffff;

  --f-display: 'Fraunces', 'Noto Serif JP', ui-serif, Georgia, serif;
  --f-jp-display: 'Noto Serif JP', 'Hiragino Mincho ProN', 'YuMincho', serif;
  --f-body: 'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', system-ui, sans-serif;
  --f-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace;

  --col: min(1080px, 100% - 3rem);
  --col-narrow: min(760px, 100% - 3rem);
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #14171e;
    --paper-warm: #1b1f28;
    --ink: #ede5d2;
    --ink-soft: #b8b1a1;
    --sub: #7a7568;
    --dim: #4a4638;
    --rule: #2a2e38;
    --rule-strong: #3a3f4b;
    --seal: #ff7355;
    --seal-ink: #14171e;
  }
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0 }
::selection { background: var(--seal); color: var(--seal-ink) }
:focus-visible { outline: 2px solid var(--seal); outline-offset: 3px; border-radius: 1px }

html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth }
body {
  font-family: var(--f-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--ink);
  background: var(--paper);
  background-image:
    radial-gradient(circle at 20% 10%, rgba(0,0,0,0.015), transparent 40%),
    radial-gradient(circle at 80% 90%, rgba(0,0,0,0.015), transparent 40%);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-x: hidden;
}

.skip-link {
  position: absolute; left: -9999px; top: auto;
  background: var(--ink); color: var(--paper);
  padding: 0.5rem 0.75rem; font-size: 0.8rem;
  z-index: 100;
}
.skip-link:focus { left: 1rem; top: 1rem }

/* ── Masthead ── */
.masthead { padding-top: 2.25rem }
.masthead-inner {
  width: var(--col);
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 2rem;
  padding-bottom: 1.5rem;
}
.wordmark {
  display: inline-flex;
  align-items: baseline;
  gap: 0.65rem;
  color: var(--ink);
  text-decoration: none;
  line-height: 0.85;
}
.wordmark-latin {
  font-family: var(--f-display);
  font-weight: 900;
  font-style: italic;
  font-size: clamp(3rem, 8vw, 5.75rem);
  letter-spacing: -0.03em;
  font-variation-settings: "opsz" 144;
}
.wordmark-jp {
  font-family: var(--f-jp-display);
  font-weight: 900;
  font-size: clamp(1.1rem, 1.8vw, 1.5rem);
  color: var(--seal);
  letter-spacing: 0.05em;
  padding-bottom: 0.35rem;
}
.tagline {
  font-family: var(--f-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sub);
  margin-top: 0.9rem;
}
.masthead-right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}
.stamp {
  position: relative;
  width: 68px; height: 68px;
  background: var(--seal);
  color: var(--seal-ink);
  transform: rotate(-4deg);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 1px var(--seal) inset, 0 0 0 3px var(--paper) inset, 0 0 0 4px var(--seal) inset;
  font-family: var(--f-jp-display);
  flex-shrink: 0;
}
.stamp-mark {
  font-size: 2.1rem;
  font-weight: 900;
  line-height: 1;
}
.stamp-label {
  position: absolute;
  bottom: -1.4rem;
  left: 50%;
  transform: translateX(-50%) rotate(4deg);
  font-family: var(--f-mono);
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  color: var(--sub);
  white-space: nowrap;
}
.date-block {
  display: grid;
  grid-template-columns: auto;
  gap: 0.15rem;
  text-align: right;
  color: var(--ink);
  text-decoration: none;
  font-family: var(--f-mono);
  transition: opacity 0.15s;
}
.date-block:hover { opacity: 0.65 }
.date-year {
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  color: var(--sub);
}
.date-md {
  font-family: var(--f-display);
  font-weight: 900;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
  letter-spacing: -0.02em;
  font-variation-settings: "opsz" 144;
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.05em;
}
.date-sep { color: var(--seal); font-weight: 700 }
.date-dow {
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  color: var(--sub);
}

/* ── Controls ── */
.controls {
  width: var(--col);
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.85rem 1.25rem;
  padding: 1rem 0 1.25rem;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.ctrl {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: var(--f-mono);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  color: var(--sub);
  text-transform: uppercase;
}
.ctrl select,
.ctrl input[type="date"] {
  font-family: var(--f-body);
  font-size: 0.85rem;
  color: var(--ink);
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--rule-strong);
  padding: 0.25rem 1.2rem 0.25rem 0;
  min-width: 8rem;
  appearance: none;
  cursor: pointer;
  background-image: linear-gradient(45deg, transparent 50%, var(--sub) 50%),
                    linear-gradient(135deg, var(--sub) 50%, transparent 50%);
  background-position: calc(100% - 10px) 55%, calc(100% - 5px) 55%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}
.ctrl input[type="date"] { background-image: none; padding-right: 0.25rem }
.ctrl select:focus,
.ctrl input:focus {
  outline: none;
  border-bottom-color: var(--seal);
}
#btn-revalidate {
  font-family: var(--f-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  align-self: end;
}
#btn-revalidate:hover { background: var(--ink); color: var(--paper) }

.masthead-rule {
  width: var(--col);
  margin: 0 auto;
  height: 0;
  border-top: 3px solid var(--ink);
  position: relative;
  margin-top: 0;
}
.masthead-rule::after {
  content: "";
  position: absolute;
  top: 6px; left: 0; right: 0;
  border-top: 1px solid var(--ink);
}

main { padding: 3.5rem 0 5rem }

/* ── Hero ── */
.hero {
  width: var(--col);
  margin: 0 auto 4rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}
.hero-figure {
  position: relative;
  overflow: hidden;
  background: var(--paper-warm);
  aspect-ratio: 21 / 9;
  border: 1px solid var(--rule);
}
.hero-figure img {
  width: 100%; height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 1.2s cubic-bezier(0.23, 1, 0.32, 1);
}
.hero:hover .hero-figure img { transform: scale(1.02) }
.hero-text { display: grid; gap: 0.9rem }
.hero-rank {
  font-family: var(--f-mono);
  color: var(--seal);
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
}
.hero-rank .rank-word { font-family: var(--f-jp-display); font-weight: 700; font-size: 0.9rem }
.hero-rank .rank-num {
  font-family: var(--f-display);
  font-style: italic;
  font-weight: 900;
  font-size: 1.5rem;
  font-variation-settings: "opsz" 144;
  line-height: 1;
}
.hero-title {
  font-family: var(--f-jp-display);
  font-weight: 900;
  font-size: clamp(1.8rem, 4vw, 3rem);
  line-height: 1.25;
  letter-spacing: -0.005em;
  max-width: 32ch;
}
.hero-title a {
  color: var(--ink);
  text-decoration: none;
  background-image: linear-gradient(var(--seal), var(--seal));
  background-repeat: no-repeat;
  background-size: 0 2px;
  background-position: 0 100%;
  transition: background-size 0.35s cubic-bezier(0.23,1,0.32,1);
  padding-bottom: 0.1em;
}
.hero-title a:hover { background-size: 100% 2px }
.hero-lead {
  font-size: 1.02rem;
  color: var(--ink-soft);
  max-width: 60ch;
  line-height: 1.75;
}
.hero-meta {
  font-family: var(--f-mono);
  font-size: 0.78rem;
  color: var(--sub);
  display: flex; gap: 0.5rem; align-items: baseline;
  flex-wrap: wrap;
}
.hero-meta .users {
  color: var(--seal);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}
.hero-meta .sep { color: var(--dim) }
.hero-meta .domain { letter-spacing: 0.02em }

/* ── Editor notes ── */
.notes {
  width: var(--col-narrow);
  margin: 0 auto 4rem;
  padding: 2rem 2.25rem 2.25rem;
  background: var(--paper-warm);
  border-top: 3px solid var(--seal);
  border-bottom: 1px solid var(--rule);
  position: relative;
}
.notes-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--rule);
}
.notes-eyebrow { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap }
.notes-kanji {
  font-family: var(--f-jp-display);
  font-weight: 900;
  font-size: 1.1rem;
  color: var(--ink);
  letter-spacing: 0.06em;
}
.notes-latin {
  font-family: var(--f-display);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--sub);
  font-variation-settings: "opsz" 9;
}
.copy-btn {
  font-family: var(--f-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--rule-strong);
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.copy-btn:hover { border-color: var(--seal); color: var(--seal) }
.copy-btn.copied { border-color: #2f7d5b; color: #2f7d5b }
.notes-overview {
  font-family: var(--f-jp-display);
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--ink);
  margin-bottom: 1.5rem;
}
.notes-subhead {
  font-family: var(--f-mono);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--sub);
  margin-bottom: 0.5rem;
}
.notes-list { list-style: none; counter-reset: notes }
.notes-list li {
  counter-increment: notes;
  padding: 0.75rem 0 0.75rem 2.25rem;
  border-bottom: 1px solid var(--rule);
  position: relative;
  font-size: 0.9rem;
}
.notes-list li:last-child { border-bottom: none }
.notes-list li::before {
  content: counter(notes, decimal-leading-zero);
  position: absolute;
  left: 0; top: 0.85rem;
  font-family: var(--f-mono);
  font-size: 0.72rem;
  color: var(--seal);
  letter-spacing: 0.08em;
}
.notes-list a {
  color: var(--ink);
  text-decoration: none;
  font-weight: 500;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}
.notes-list a:hover { border-bottom-color: var(--seal) }
.notes-summary {
  display: block;
  color: var(--sub);
  font-size: 0.82rem;
  margin-top: 0.2rem;
  line-height: 1.65;
}

/* ── Roll (ranked list) ── */
.roll {
  width: var(--col);
  margin: 0 auto;
}
.roll-eyebrow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--ink);
  margin-bottom: 0.5rem;
}
.roll-eyebrow > span:first-child {
  font-family: var(--f-jp-display);
  font-weight: 900;
  font-size: 1.05rem;
  letter-spacing: 0.05em;
}
.roll-count {
  font-family: var(--f-mono);
  font-size: 0.72rem;
  color: var(--sub);
  letter-spacing: 0.12em;
}
.roll-list { list-style: none }
.row {
  display: grid;
  grid-template-columns: 4.5rem 1fr 140px;
  gap: 1.75rem;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--rule);
  align-items: start;
}
.row:last-child { border-bottom: none }
.row:not(:has(.row-thumb)) { grid-template-columns: 4.5rem 1fr }
.row-rank {
  font-family: var(--f-display);
  font-style: italic;
  font-weight: 900;
  font-size: clamp(2.4rem, 4.5vw, 3.5rem);
  line-height: 0.9;
  color: var(--ink);
  font-variation-settings: "opsz" 144;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  padding-top: 0.15em;
}
.row:hover .row-rank { color: var(--seal); transition: color 0.2s }
.row-body { min-width: 0 }
.row-title {
  font-family: var(--f-jp-display);
  font-weight: 700;
  font-size: 1.15rem;
  line-height: 1.4;
  margin-bottom: 0.4rem;
}
.row-title a {
  color: var(--ink);
  text-decoration: none;
  background-image: linear-gradient(var(--seal), var(--seal));
  background-repeat: no-repeat;
  background-size: 0 1px;
  background-position: 0 100%;
  transition: background-size 0.3s ease;
  padding-bottom: 0.08em;
}
.row-title a:hover { background-size: 100% 1px; color: var(--seal) }
.row-meta {
  font-family: var(--f-mono);
  font-size: 0.7rem;
  color: var(--sub);
  display: flex; gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.row-meta .users {
  color: var(--seal);
  font-variant-numeric: tabular-nums;
}
.row-meta .sep { color: var(--dim) }
.row-lead {
  font-size: 0.85rem;
  color: var(--ink-soft);
  margin-bottom: 0.5rem;
  max-width: 55ch;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.row-thumb {
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: var(--paper-warm);
  border: 1px solid var(--rule);
}
.row-thumb img {
  width: 100%; height: 100%; object-fit: cover; display: block;
  filter: saturate(0.9);
  transition: filter 0.3s, transform 0.6s cubic-bezier(0.23,1,0.32,1);
}
.row:hover .row-thumb img { filter: saturate(1); transform: scale(1.03) }

/* ── Tags ── */
.tags { list-style: none; display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.35rem }
.tags li {
  font-family: var(--f-mono);
  font-size: 0.68rem;
  color: var(--sub);
  letter-spacing: 0.03em;
  padding: 0.1rem 0.55rem;
  border: 1px solid var(--rule);
  transition: border-color 0.15s, color 0.15s;
}
.tags li::before { content: "#"; opacity: 0.6; margin-right: 0.15em }
.tags li:hover { border-color: var(--seal); color: var(--seal) }
.tags--small li { font-size: 0.65rem; padding: 0.05rem 0.45rem }

/* ── Colophon ── */
.colophon {
  border-top: 1px solid var(--rule);
  padding: 2.5rem 0 3.5rem;
  margin-top: 4rem;
}
.colophon-inner {
  width: var(--col);
  margin: 0 auto;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  font-family: var(--f-mono);
  font-size: 0.72rem;
  color: var(--sub);
  letter-spacing: 0.1em;
  flex-wrap: wrap;
}
.colophon-brand {
  font-family: var(--f-display);
  font-style: italic;
  font-weight: 900;
  font-size: 1.2rem;
  letter-spacing: -0.01em;
  color: var(--ink);
  font-variation-settings: "opsz" 144;
}
.colophon-sub { text-transform: uppercase }
.colophon-date { font-variant-numeric: tabular-nums }

/* ── Error page ── */
.err-wrap {
  min-height: 100vh;
  width: var(--col-narrow);
  margin: 0 auto;
  padding: 4rem 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 1.5rem 2.5rem;
  align-content: start;
}
.err-stamp {
  position: relative;
  width: 88px; height: 88px;
  background: var(--seal);
  color: var(--seal-ink);
  transform: rotate(-6deg);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 1px var(--seal) inset, 0 0 0 4px var(--paper) inset, 0 0 0 5px var(--seal) inset;
  font-family: var(--f-jp-display);
}
.err-stamp-mark { font-size: 2.6rem; font-weight: 900; line-height: 1 }
.err-stamp-label {
  position: absolute; bottom: -1.4rem; left: 50%;
  transform: translateX(-50%) rotate(6deg);
  font-family: var(--f-mono);
  font-size: 0.7rem; letter-spacing: 0.12em;
  color: var(--sub); white-space: nowrap;
}
.err-date {
  text-align: right;
  font-family: var(--f-mono);
  display: grid; gap: 0.15rem;
  align-self: start;
}
.err-date .date-year { font-size: 0.72rem; color: var(--sub); letter-spacing: 0.16em }
.err-date .date-md {
  font-family: var(--f-display); font-weight: 900;
  font-size: 2.4rem; line-height: 1;
  font-variation-settings: "opsz" 144;
  display: inline-flex; justify-content: flex-end; align-items: baseline;
  gap: 0.05em;
}
.err-date .date-sep { color: var(--seal) }
.err-box {
  grid-column: 1 / -1;
  padding: 2.5rem 0 0;
  border-top: 3px solid var(--ink);
  margin-top: 1rem;
}
.err-eyebrow {
  font-family: var(--f-mono);
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--seal);
  margin-bottom: 1rem;
}
.err-box h1 {
  font-family: var(--f-jp-display);
  font-weight: 900;
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  line-height: 1.35;
  color: var(--ink);
  margin-bottom: 1.5rem;
  max-width: 24ch;
}
.err-details p {
  font-size: 0.95rem;
  color: var(--ink-soft);
  line-height: 1.8;
  margin-bottom: 0.5rem;
  max-width: 48ch;
}
.err-link { margin-top: 2rem }
.err-link a {
  font-family: var(--f-mono);
  font-size: 0.85rem;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--ink);
  padding-bottom: 0.15rem;
  letter-spacing: 0.05em;
  transition: color 0.15s, border-color 0.15s;
}
.err-link a:hover { color: var(--seal); border-color: var(--seal) }

/* ── Load animation ── */
@media (prefers-reduced-motion: no-preference) {
  .hero-title, .hero-lead, .hero-figure, .hero-rank, .hero-meta {
    animation: rise 0.7s cubic-bezier(0.23, 1, 0.32, 1) both;
  }
  .hero-figure { animation-delay: 0.05s }
  .hero-rank { animation-delay: 0.15s }
  .hero-title { animation-delay: 0.2s }
  .hero-lead { animation-delay: 0.28s }
  .hero-meta { animation-delay: 0.35s }
  @keyframes rise {
    from { opacity: 0; transform: translateY(14px) }
    to { opacity: 1; transform: none }
  }
}
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .row {
      animation: row-in linear both;
      animation-timeline: view();
      animation-range: entry 0% entry 30%;
    }
    @keyframes row-in {
      from { opacity: 0.3; transform: translateY(20px) }
      to { opacity: 1; transform: none }
    }
  }
}

/* ── Responsive ── */
@media (max-width: 780px) {
  :root { --col: min(1080px, 100% - 2rem); --col-narrow: min(760px, 100% - 2rem) }
  .masthead { padding-top: 1.5rem }
  .masthead-inner {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding-bottom: 1.25rem;
  }
  .masthead-right {
    justify-content: space-between;
    gap: 1rem;
  }
  .wordmark-latin { font-size: clamp(2.6rem, 14vw, 4rem) }
  .stamp { width: 56px; height: 56px }
  .stamp-mark { font-size: 1.7rem }
  .stamp-label { bottom: -1.2rem; font-size: 0.6rem }
  .date-md { font-size: 2rem }
  .controls {
    padding: 0.85rem 0 1rem;
    gap: 0.7rem 1rem;
  }
  .ctrl select, .ctrl input[type="date"] { min-width: 6.5rem; font-size: 0.9rem }
  main { padding: 2rem 0 3rem }
  .hero { margin-bottom: 3rem }
  .hero-figure { aspect-ratio: 16 / 10 }
  .row {
    grid-template-columns: 3rem 1fr;
    gap: 1rem;
    padding: 1.25rem 0;
  }
  .row-thumb { display: none }
  .row-rank { font-size: 2.4rem }
  .row-title { font-size: 1rem }
  .notes { padding: 1.5rem 1.5rem 1.75rem }
  .colophon-inner { flex-direction: column; align-items: flex-start; gap: 0.4rem }
}

@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important }
}
`;
}

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
