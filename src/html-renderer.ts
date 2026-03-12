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
  const title = `HINICHI // ${label} // ${dateStr}`;
  const hotentryUrl = `https://b.hatena.ne.jp/hotentry/${category}/${dateStr.replace(/-/g, "")}`;
  const maxUsers = Math.max(...entries.map((e) => e.users), 1);

  const summarySection = options.summary ? buildSummarySection(options.summary) : "";
  const hero = entries.length > 0 ? buildHero(entries[0], maxUsers) : "";
  const feed = entries
    .slice(1)
    .map((e, i) => buildEntry(e, i, maxUsers))
    .join("\n");

  const catOpts = CATEGORIES.map(
    (c) =>
      `<option value="${c}"${c === category ? " selected" : ""}>${esc(CATEGORY_LABELS[c])}</option>`,
  ).join("");
  const fmtOpts = ["html", "rss", "atom", "json"]
    .map(
      (f) =>
        `<option value="${f}"${f === options.currentFormat ? " selected" : ""}>${f.toUpperCase()}</option>`,
    )
    .join("");
  const sumOpts = [
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
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>${buildCss()}</style>
</head>
<body>
<canvas id="voidBg" aria-hidden="true"></canvas>
<div class="scanlines" aria-hidden="true"></div>
<div class="progress-bar" aria-hidden="true"></div>
<div id="cursorGlow" aria-hidden="true"></div>

<header class="cmd">
  <div class="cmd-l">
    <h1 class="logo" data-text="HINICHI">HINICHI</h1>
    <span class="sep">//</span>
    <a href="${escapeAttr(hotentryUrl)}" class="cmd-lbl">${esc(label)}</a>
    <span class="sep">//</span>
    <span class="cmd-lbl">${esc(dateStr)}</span>
  </div>
  <nav class="cmd-r">
    <select id="sel-category">${catOpts}</select>
    <input type="date" id="sel-date" value="${dateStr}" />
    <select id="sel-format">${fmtOpts}</select>
    <select id="sel-summary">${sumOpts}</select>
    <button id="btn-revalidate" title="revalidate">&#x21bb;</button>
  </nav>
</header>

<main>
${hero}
${summarySection}
<div class="feed">${feed}</div>
</main>

<footer><span class="prompt">&gt;_</span> hinichi &mdash; はてなブックマーク デイリーダイジェスト</footer>

<script type="module" src="/client.js"></script>
</body>
</html>`;
}

function buildHero(e: HatenaEntry, maxUsers: number): string {
  const pct = Math.round((e.users / maxUsers) * 100);
  const bg = e.imageUrl ? ` style="background-image:url(${escapeAttr(e.imageUrl)})"` : "";
  const tags =
    e.tags.length > 0
      ? `<div class="tags">${e.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}</div>`
      : "";
  return `<section class="hero"${bg}>
  <div class="hero-over">
    <div class="hero-rank" aria-hidden="true">01</div>
    <div class="hero-body">
      <div class="meta"><span class="ubadge">${e.users} users</span><span class="domain">${esc(e.domain)}</span></div>
      <div class="pop"><div class="pop-fill" style="width:${pct}%"></div></div>
      <h2><a href="${escapeAttr(e.url)}">${esc(e.title)}</a></h2>
      ${e.description ? `<p>${esc(e.description)}</p>` : ""}
      ${tags}
    </div>
  </div>
</section>`;
}

function buildEntry(e: HatenaEntry, index: number, maxUsers: number): string {
  const rank = String(index + 2).padStart(2, "0");
  const pct = Math.round((e.users / maxUsers) * 100);
  const img = e.imageUrl
    ? `<img class="entry-img" src="${escapeAttr(e.imageUrl)}" alt="" loading="lazy" onerror="this.remove()" />`
    : "";
  const tags =
    e.tags.length > 0
      ? `<div class="tags">${e.tags.map((t) => `<span>#${esc(t)}</span>`).join("")}</div>`
      : "";
  return `<article class="entry">
  <div class="entry-rank">${rank}</div>
  <div class="entry-main">
    <div class="meta"><span class="ubadge">${e.users} users</span><span class="domain">${esc(e.domain)}</span></div>
    <div class="pop"><div class="pop-fill" style="width:${pct}%"></div></div>
    ${img}
    <h3><a href="${escapeAttr(e.url)}">${esc(e.title)}</a></h3>
    ${e.description ? `<p>${esc(e.description)}</p>` : ""}
    ${tags}
  </div>
</article>`;
}

function buildSummarySection(summary: AISummaryResult): string {
  const articleList = summary.articles
    .map(
      (a) =>
        `<li><a href="${escapeAttr(a.url)}">${esc(a.title)}</a><span class="article-summary">&mdash; ${esc(a.summary)}</span></li>`,
    )
    .join("\n      ");
  const copyText = buildCopyText(summary);
  return `<section class="summary">
  <div class="summary-head">
    <h2>// SUMMARY</h2>
    <button class="copy-btn" data-copy-text="${escapeAttr(copyText)}">COPY</button>
  </div>
  <div class="overview">${esc(summary.overview)}</div>
  <h3>ARTICLES</h3>
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
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=JetBrains+Mono:wght@300;400;500;700&display=swap" rel="stylesheet">
<style>${buildCss()}</style>
</head>
<body>
<canvas id="voidBg" aria-hidden="true"></canvas>
<div class="scanlines" aria-hidden="true"></div>

<div class="err-wrap">
  <h1 class="logo" data-text="HINICHI">HINICHI</h1>
  <div class="err-box">
    <div class="err-label">// ERROR</div>
    <h2>${esc(message)}</h2>
    ${detailsHtml}
    <p><a href="${escapeAttr(linkHref)}">${esc(linkLabel)} &rarr;</a></p>
  </div>
</div>

<script type="module" src="/client.js"></script>
</body>
</html>`;
}

/* ── CSS ────────────────────────────────────────────── */

function buildCss(): string {
  return `
:root {
  color-scheme: light dark;
  --bg:#f5f2eb;--surface:#eae7e0;
  --ink:#0a0a1e;--ink2:#2a2a3e;--ink3:#6a6a7e;
  --c1:#007a7a;--c2:#b31060;--c3:#4a3fb5;
  --border:#d0cbc3;
  --display:'Orbitron',monospace;
  --mono:'JetBrains Mono','Menlo',monospace;
}
@media (prefers-color-scheme: dark) {:root{
  --bg:#05050f;--surface:#0c0c1a;
  --ink:#e8e8f0;--ink2:#a8a8b8;--ink3:#55556a;
  --c1:#00ffd5;--c2:#ff2d95;--c3:#6c63ff;
  --border:#1a1a2e;
}}

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
::selection{background:var(--c1);color:#000}
:focus-visible{outline:2px solid var(--c1);outline-offset:2px}
body{font-family:var(--mono);color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}

/* ── background layers ── */
#voidBg{position:fixed;inset:0;z-index:0;width:100%;height:100%;pointer-events:none}
@media (prefers-color-scheme:light){#voidBg{opacity:.05}}
.scanlines{position:fixed;inset:0;z-index:2;pointer-events:none;
  background:repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(0,0,0,.03) 2px,rgba(0,0,0,.03) 4px)}
@media (prefers-color-scheme:light){.scanlines{opacity:.2}}
.progress-bar{position:fixed;top:0;left:0;height:2px;width:0;
  background:linear-gradient(90deg,var(--c1),var(--c2));z-index:10001;transition:width .1s linear}
#cursorGlow{position:fixed;width:280px;height:280px;border-radius:50%;
  background:radial-gradient(circle,var(--c1),transparent 70%);
  pointer-events:none;z-index:1;transform:translate(-50%,-50%);opacity:0;
  transition:opacity .4s;mix-blend-mode:screen;filter:blur(40px)}
@media (prefers-color-scheme:light){#cursorGlow{display:none}}

/* ── command bar ── */
.cmd{position:fixed;top:0;left:0;right:0;z-index:100;height:48px;display:flex;align-items:center;
  justify-content:space-between;padding:0 1.5rem;border-bottom:1px solid var(--border);font-size:.75rem;
  background:var(--surface);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
@media (prefers-color-scheme:dark){.cmd{background:rgba(12,12,26,.85)}}
.cmd-l,.cmd-r{display:flex;align-items:center;gap:.75rem}
.cmd-r{flex-wrap:wrap}
.sep{color:var(--ink3);font-weight:300}
.cmd-lbl{color:var(--ink2);text-decoration:none;transition:color .15s}
.cmd-lbl:hover{color:var(--c1)}
.cmd select,.cmd input[type="date"]{font-family:var(--mono);font-size:.7rem;padding:.25rem .5rem;
  background:transparent;border:1px solid var(--border);color:var(--ink);cursor:pointer;appearance:none}
.cmd select:focus,.cmd input:focus{outline:none;border-color:var(--c1);box-shadow:0 0 0 1px var(--c1)}
.cmd button{font-family:var(--mono);font-size:.8rem;padding:.2rem .5rem;
  background:transparent;border:1px solid var(--border);color:var(--ink);cursor:pointer;transition:all .15s}
.cmd button:hover{border-color:var(--c1);color:var(--c1)}

/* ── logo glitch ── */
.logo{font-family:var(--display);font-weight:900;font-size:.85rem;letter-spacing:.2em;
  color:var(--c1);position:relative;display:inline-block;line-height:1}
.logo::before,.logo::after{content:attr(data-text);position:absolute;left:0;top:0;overflow:hidden;pointer-events:none}
.logo::before{color:var(--c2);z-index:-1;animation:g1 3s infinite linear alternate-reverse}
.logo::after{color:var(--c3);z-index:-1;animation:g2 2s infinite linear alternate-reverse}
@keyframes g1{
  0%,100%{clip-path:inset(0 0 95% 0);transform:translate(0)}
  20%{clip-path:inset(15% 0 65% 0);transform:translate(-2px,1px)}
  40%{clip-path:inset(45% 0 25% 0);transform:translate(2px,-1px)}
  60%{clip-path:inset(70% 0 10% 0);transform:translate(-1px,2px)}
  80%{clip-path:inset(5% 0 85% 0);transform:translate(1px,-1px)}}
@keyframes g2{
  0%,100%{clip-path:inset(95% 0 0 0);transform:translate(0)}
  25%{clip-path:inset(55% 0 15% 0);transform:translate(2px,-1px)}
  50%{clip-path:inset(25% 0 45% 0);transform:translate(-2px,1px)}
  75%{clip-path:inset(5% 0 75% 0);transform:translate(1px,1px)}}

/* ── main ── */
main{padding-top:48px;position:relative;z-index:1}

/* ── hero ── */
.hero{margin-top:-48px;min-height:100vh;background-color:#0c0c1a;background-size:cover;background-position:center;
  display:flex;align-items:flex-end;position:relative}
.hero-over{width:100%;padding:80px 3rem 3rem;position:relative;
  background:linear-gradient(to top,rgba(5,5,15,.95),rgba(5,5,15,.5) 50%,transparent)}
.hero-rank{position:absolute;bottom:2rem;right:3rem;font-family:var(--display);font-weight:900;
  font-size:10rem;line-height:1;color:#00ffd5;opacity:.07;pointer-events:none;user-select:none}
.hero-body{max-width:700px}
.hero h2{font-family:var(--display);font-size:2.2rem;font-weight:700;line-height:1.2;margin:.5rem 0}
.hero h2 a{color:#fff;text-decoration:none}
.hero p{color:rgba(255,255,255,.65);font-size:.88rem;line-height:1.6;margin:.25rem 0 0}
.hero .ubadge{font-weight:700;color:#00ffd5;letter-spacing:.05em}
.hero .domain{color:rgba(255,255,255,.45)}
.hero .meta{display:flex;gap:.75rem;align-items:center;font-size:.75rem}
.hero .pop{max-width:180px}
.hero .tags span{color:rgba(255,255,255,.5);border-color:rgba(255,255,255,.2)}

/* ── feed ── */
.feed{max-width:960px;margin:0 auto;padding:2rem 0}

/* ── entry ── */
.entry{display:flex;gap:2rem;padding:3rem;border-bottom:1px solid var(--border)}
.entry-rank{font-family:var(--display);font-weight:900;font-size:3rem;line-height:1;
  color:var(--c1);opacity:.2;flex-shrink:0;width:5rem;text-align:right}
.entry-main{flex:1;min-width:0}
.entry-img{width:100%;max-height:360px;object-fit:cover;display:block;margin:.75rem 0}
.entry h3{font-family:var(--display);font-size:1.15rem;font-weight:700;line-height:1.3;margin:.5rem 0 .25rem}
.entry h3 a{color:var(--ink);text-decoration:none;transition:color .15s}
.entry h3 a:hover{color:var(--c1)}
.entry p{font-size:.84rem;color:var(--ink2);line-height:1.6}

/* ── shared: meta, pop, tags ── */
.meta{display:flex;gap:.75rem;align-items:center;font-size:.75rem}
.ubadge{font-weight:700;color:var(--c1);letter-spacing:.05em}
.domain{color:var(--ink3)}
.pop{height:2px;background:var(--border);margin:.5rem 0;max-width:200px}
.pop-fill{height:100%;background:linear-gradient(90deg,var(--c1),var(--c2))}
.tags{display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.6rem}
.tags span{font-size:.68rem;color:var(--ink3);border:1px solid var(--border);padding:.08rem .5rem;letter-spacing:.02em;transition:border-color .15s}
.tags span:hover{border-color:var(--c1);color:var(--c1)}

/* ── summary ── */
.summary{max-width:960px;margin:2rem auto;padding:2rem 3rem;background:var(--surface);border:1px solid var(--border)}
.summary-head{display:flex;justify-content:space-between;align-items:baseline}
.summary-head h2{font-family:var(--display);font-size:.7rem;letter-spacing:.15em;color:var(--c1);font-weight:700}
.copy-btn{font-family:var(--mono);font-size:.65rem;color:var(--ink3);background:transparent;
  border:1px solid var(--border);padding:.15rem .5rem;cursor:pointer;transition:all .15s}
.copy-btn:hover{border-color:var(--c1);color:var(--c1)}
.copy-btn.copied{border-color:#22c55e;color:#22c55e}
.summary .overview{font-size:.85rem;line-height:1.8;color:var(--ink2);margin:.75rem 0 1rem}
.summary h3{font-family:var(--display);font-size:.6rem;text-transform:uppercase;letter-spacing:.12em;
  color:var(--ink3);margin:1rem 0 .5rem;border-bottom:1px solid var(--border);padding-bottom:.3rem}
.summary ul{list-style:none}
.summary li{padding:.4rem 0;border-bottom:1px solid var(--border)}
.summary li:last-child{border-bottom:none}
.summary li a{color:var(--ink);text-decoration:none;font-weight:500;font-size:.82rem;transition:color .15s}
.summary li a:hover{color:var(--c1)}
.article-summary{display:block;font-size:.75rem;color:var(--ink3);margin-top:.1rem}

/* ── error ── */
.err-wrap{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:2rem;gap:2rem}
.err-box{max-width:500px;width:100%;padding:2rem;background:var(--surface);border:1px solid var(--border)}
.err-label{font-family:var(--display);font-size:.65rem;letter-spacing:.15em;color:var(--c2);margin-bottom:1rem}
.err-box h2{font-family:var(--mono);font-size:1rem;font-weight:700;color:var(--c2);margin:0 0 1rem}
.err-box p{font-size:.85rem;color:var(--ink2);line-height:1.7;margin:0 0 .5rem}
.err-box a{color:var(--c1);text-decoration:none;transition:opacity .15s}
.err-box a:hover{opacity:.75}

/* ── footer ── */
footer{text-align:center;padding:3rem;font-size:.75rem;color:var(--ink3);border-top:1px solid var(--border);
  position:relative;z-index:1}
.prompt{color:var(--c1);font-weight:700}

/* ── responsive ── */
@media(max-width:768px){
  .cmd{flex-wrap:wrap;height:auto;padding:.5rem 1rem;gap:.4rem}
  .cmd-l,.cmd-r{flex:1 1 100%;justify-content:center;flex-wrap:wrap}
  .hero-over{padding:60px 1.5rem 2rem}
  .hero-rank{font-size:5rem;right:1.5rem;bottom:1.5rem}
  .hero h2{font-size:1.4rem}
  .hero-body{max-width:none}
  .entry{flex-direction:column;gap:.5rem;padding:2rem 1.5rem}
  .entry-rank{width:auto;text-align:left;font-size:2rem}
  .feed{padding:1rem 0}
  .summary{padding:1.5rem;margin:1.5rem 1rem}
}
`;
}

/* ── Escape helpers ─────────────────────────────────── */

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
