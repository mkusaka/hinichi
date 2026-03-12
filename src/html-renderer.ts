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
  const title = `はてなブックマーク - ${label} - ${dateStr}`;
  const hotentryUrl = `https://b.hatena.ne.jp/hotentry/${category}/${dateStr.replace(/-/g, "")}`;

  const summarySection = options.summary ? buildSummarySection(options.summary) : "";

  const entriesHtml = entries
    .map(
      (e, i) => `
      <article style="--i:${i}">
        <h3><a href="${escapeAttr(e.url)}">${esc(e.title)}</a></h3>
        <div class="meta">
          <span class="users">${e.users} users</span>
          <span class="domain">${esc(e.domain)}</span>
        </div>
        ${e.description ? `<p>${esc(e.description)}</p>` : ""}
        ${e.tags.length > 0 ? `<div class="tags">${e.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
      </article>`,
    )
    .join("\n");

  const categoryOptions = CATEGORIES.map(
    (c) =>
      `<option value="${c}"${c === category ? " selected" : ""}>${esc(CATEGORY_LABELS[c])}</option>`,
  ).join("\n        ");

  const formatOptions = ["html", "rss", "atom", "json"]
    .map(
      (f) =>
        `<option value="${f}"${f === options.currentFormat ? " selected" : ""}>${f.toUpperCase()}</option>`,
    )
    .join("\n        ");

  const summaryOptions = [
    { value: "", label: "なし" },
    { value: "ai", label: "要約付き" },
    { value: "aiOnly", label: "要約のみ" },
  ]
    .map(
      (s) =>
        `<option value="${s.value}"${s.value === (options.currentSummary || "") ? " selected" : ""}>${s.label}</option>`,
    )
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@700;900&display=swap" rel="stylesheet">
  <style>
    ${buildThemeCss()}
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    ::selection { background: var(--accent); color: #fff; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    body { font-family: var(--sans); color: var(--ink); background: var(--bg); margin: 0; padding: 0; min-height: 100vh; line-height: 1.75; -webkit-font-smoothing: antialiased; }
    .container { max-width: 780px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; animation: enter 0.5s ease-out; }

    header { text-align: center; padding: 1rem 0 2rem; margin-bottom: 2rem; position: relative; }
    header::before { content: ''; position: absolute; top: -10%; left: 50%; transform: translateX(-50%); width: 320px; height: 200px; background: radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%); pointer-events: none; z-index: 0; }
    header h1 { font-family: var(--serif); font-size: 3.2rem; font-weight: 900; margin: 0; letter-spacing: 0.25em; line-height: 1.2; position: relative; z-index: 1; }
    header h1::after { content: ''; display: block; width: 2.5rem; height: 2px; background: var(--accent); margin: 0.6rem auto 0; }
    .subtitle { display: block; font-family: var(--sans); font-weight: 400; font-size: 0.55rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--ink-muted); margin-top: 0.4rem; }
    header .date { font-size: 0.82rem; color: var(--ink-muted); margin-top: 0.75rem; position: relative; z-index: 1; }
    header .date a { color: inherit; text-decoration: none; transition: color 0.2s; }
    header .date a:hover { color: var(--accent); }

    .controls { display: flex; gap: 0.75rem; align-items: flex-end; flex-wrap: wrap; margin-bottom: 2rem; background: var(--surface-blur); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 1rem 1.25rem; box-shadow: var(--shadow-sm); }
    .controls label { font-size: 0.72rem; color: var(--ink-muted); display: flex; flex-direction: column; gap: 0.3rem; letter-spacing: 0.04em; }
    .controls select, .controls input[type="date"] { font-family: var(--sans); font-size: 0.82rem; padding: 0.45rem 0.75rem; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-card); color: var(--ink); cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
    .controls select { appearance: none; padding-right: 1.8rem; background-image: linear-gradient(45deg, transparent 50%, var(--ink-muted) 50%), linear-gradient(135deg, var(--ink-muted) 50%, transparent 50%); background-position: calc(100% - 1rem) calc(50% - 0.12rem), calc(100% - 0.7rem) calc(50% - 0.12rem); background-size: 0.28rem 0.28rem; background-repeat: no-repeat; }
    .controls select:focus, .controls input[type="date"]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-glow); }
    .feed-links { margin-left: auto; display: flex; gap: 0.4rem; align-items: center; }
    .feed-links a { font-size: 0.78rem; color: var(--ink-muted); text-decoration: none; border: 1px solid var(--border); border-radius: 20px; padding: 0.4rem 0.7rem; background: var(--bg-card); transition: all 0.2s; }
    .feed-links a:hover { border-color: var(--accent); color: var(--accent); }
    .revalidate-btn { font-family: var(--sans); font-size: 0.78rem; color: var(--ink-muted); background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 0.4rem 0.7rem; cursor: pointer; transition: all 0.2s; }
    .revalidate-btn:hover { border-color: var(--accent); color: var(--accent); }
    .revalidate-btn.loading { opacity: 0.5; pointer-events: none; }

    .summary { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 1.75rem 2rem; margin-bottom: 2.5rem; box-shadow: var(--shadow-md); position: relative; overflow: hidden; }
    .summary::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--accent) 0%, transparent 100%); }
    .summary-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.75rem; }
    .summary-header h2 { font-family: var(--serif); font-size: 1.15rem; margin: 0; letter-spacing: 0.05em; }
    .copy-btn { font-family: var(--sans); font-size: 0.72rem; color: var(--ink-muted); background: transparent; border: 1px solid var(--border); border-radius: 20px; padding: 0.25rem 0.65rem; cursor: pointer; transition: all 0.2s; }
    .copy-btn:hover { border-color: var(--ink-secondary); color: var(--ink-secondary); }
    .copy-btn.copied { border-color: var(--success); color: var(--success); }
    .summary .overview { font-size: 0.92rem; line-height: 1.85; color: var(--ink-secondary); margin-bottom: 1.25rem; }
    .summary h3 { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-muted); margin: 1.25rem 0 0.75rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem; }
    .summary ul { list-style: none; padding: 0; margin: 0; }
    .summary li { padding: 0.5rem 0; border-bottom: 1px solid var(--border-subtle); line-height: 1.6; }
    .summary li:last-child { border-bottom: none; }
    .summary li a { color: var(--ink); text-decoration: none; font-weight: 500; font-size: 0.88rem; transition: color 0.15s; }
    .summary li a:hover { color: var(--accent); }
    .article-summary { display: block; font-size: 0.8rem; color: var(--ink-muted); margin-top: 0.15rem; }

    .entries { display: flex; flex-direction: column; gap: 0.75rem; }
    article { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.25rem 1.5rem; box-shadow: var(--shadow-sm); transition: transform 0.2s ease, box-shadow 0.2s ease; animation: enter 0.4s ease-out both; animation-delay: calc(0.03s * var(--i, 0)); }
    article:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    article h3 { font-family: var(--serif); font-size: 1.02rem; font-weight: 700; margin: 0 0 0.4rem; line-height: 1.55; }
    article h3 a { color: var(--ink); text-decoration: none; transition: color 0.2s; }
    article h3 a:hover { color: var(--accent); }
    .meta { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap; }
    .users { font-size: 0.7rem; font-weight: 700; color: var(--accent); background: var(--accent-badge); padding: 0.12rem 0.5rem; border-radius: 20px; letter-spacing: 0.02em; }
    .domain { font-size: 0.75rem; color: var(--ink-muted); }
    article p { font-size: 0.85rem; color: var(--ink-secondary); margin: 0.35rem 0 0; line-height: 1.7; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
    .tags span { font-size: 0.68rem; color: var(--ink-muted); background: var(--tag-bg); border: 1px solid var(--tag-border); padding: 0.12rem 0.5rem; border-radius: 20px; transition: all 0.15s; cursor: default; }
    .tags span:hover { background: var(--tag-hover-bg); color: var(--ink-secondary); }

    footer { margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--border-subtle); font-size: 0.7rem; color: var(--ink-muted); text-align: center; letter-spacing: 0.12em; }

    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>日日<span class="subtitle">hinichi</span></h1>
      <div class="date"><a href="${escapeAttr(hotentryUrl)}">${esc(label)} — ${esc(dateStr)}</a></div>
    </header>
    <div class="controls">
      <label>カテゴリ
        <select id="sel-category">
          ${categoryOptions}
        </select>
      </label>
      <label>日付
        <input type="date" id="sel-date" value="${dateStr}" />
      </label>
      <label>フォーマット
        <select id="sel-format">
          ${formatOptions}
        </select>
      </label>
      <label>サマリ
        <select id="sel-summary">
          ${summaryOptions}
        </select>
      </label>
      <span class="feed-links">
        <a href="/${category}?format=rss${options.currentSummary ? "&summary=" + options.currentSummary : ""}&date=${options.currentDate}">RSS</a>
        <a href="/${category}?format=atom${options.currentSummary ? "&summary=" + options.currentSummary : ""}&date=${options.currentDate}">Atom</a>
        <a href="/${category}?format=json${options.currentSummary ? "&summary=" + options.currentSummary : ""}&date=${options.currentDate}">JSON</a>
        <button class="revalidate-btn" id="btn-revalidate" title="キャッシュを破棄して再取得">再取得</button>
      </span>
    </div>
    ${summarySection}
    <div class="entries">
      ${entriesHtml}
    </div>
    <footer>hinichi — はてなブックマーク デイリーダイジェスト</footer>
  </div>
  <script>
    function navigate() {
      var cat = document.getElementById('sel-category').value;
      var dateVal = document.getElementById('sel-date').value.replace(/-/g, '');
      var fmt = document.getElementById('sel-format').value;
      var sum = document.getElementById('sel-summary').value;
      var params = new URLSearchParams();
      params.set('format', fmt);
      params.set('date', dateVal);
      if (sum) params.set('summary', sum);
      window.location.href = '/' + cat + '?' + params.toString();
    }
    document.getElementById('sel-category').addEventListener('change', navigate);
    document.getElementById('sel-date').addEventListener('change', navigate);
    document.getElementById('sel-format').addEventListener('change', navigate);
    document.getElementById('sel-summary').addEventListener('change', navigate);
    document.getElementById('btn-revalidate').addEventListener('click', function() {
      var btn = this;
      btn.textContent = '取得中…';
      btn.classList.add('loading');
      var params = new URLSearchParams(window.location.search);
      params.set('revalidate', 'true');
      window.location.href = window.location.pathname + '?' + params.toString();
    });
  </script>
</body>
</html>`;
}

function buildSummarySection(summary: AISummaryResult): string {
  const articleList = summary.articles
    .map(
      (a) =>
        `<li><a href="${escapeAttr(a.url)}">${esc(a.title)}</a> <span class="article-summary">— ${esc(a.summary)}</span></li>`,
    )
    .join("\n      ");

  const copyText = buildCopyText(summary);

  return `<section class="summary">
    <div class="summary-header">
      <h2>要約</h2>
      <button class="copy-btn" data-copy-text="${escapeAttr(copyText)}">コピー</button>
    </div>
    <div class="overview">${esc(summary.overview)}</div>
    <h3>各記事の要約</h3>
    <ul>
      ${articleList}
    </ul>
  </section>
  <script>
    document.querySelector('.copy-btn').addEventListener('click', function() {
      var btn = this;
      navigator.clipboard.writeText(btn.dataset.copyText).then(function() {
        btn.textContent = 'コピー済み';
        btn.classList.add('copied');
        setTimeout(function() {
          btn.textContent = 'コピー';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  </script>`;
}

function buildCopyText(summary: AISummaryResult): string {
  const lines = [summary.overview, ""];
  for (const a of summary.articles) {
    lines.push(`- ${a.title}: ${a.summary}`);
    lines.push(`  ${a.url}`);
  }
  return lines.join("\n");
}

function buildThemeCss(): string {
  return `
    :root {
      color-scheme: light dark;

      --ink: #111;
      --ink-secondary: #444;
      --ink-muted: #6b6560;

      --bg: #f5f2ed;
      --bg-card: rgba(255, 255, 255, 0.88);
      --bg-elevated: #faf8f5;
      --surface-blur: rgba(245, 242, 237, 0.72);

      --border: #e0dbd3;
      --border-subtle: #eae6df;

      --accent: #c23b22;
      --accent-glow: rgba(194, 59, 34, 0.1);
      --accent-badge: rgba(194, 59, 34, 0.1);

      --tag-bg: transparent;
      --tag-border: #d4cfc7;
      --tag-hover-bg: #eae6df;

      --success: #2d8a4e;

      --shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
      --shadow-md: 0 4px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03);

      --serif: 'Zen Old Mincho', serif;
      --sans: 'Zen Kaku Gothic New', sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --ink: #e8e0d6;
        --ink-secondary: #b8ae9f;
        --ink-muted: #948a7e;

        --bg: #0e0c0a;
        --bg-card: rgba(26, 22, 18, 0.9);
        --bg-elevated: #161310;
        --surface-blur: rgba(14, 12, 10, 0.78);

        --border: #2e2820;
        --border-subtle: #241f1a;

        --accent: #e8725c;
        --accent-glow: rgba(232, 114, 92, 0.14);
        --accent-badge: rgba(232, 114, 92, 0.16);

        --tag-bg: transparent;
        --tag-border: #3a3228;
        --tag-hover-bg: #2e2820;

        --success: #62c87a;

        --shadow-sm: 0 1px 3px rgba(0,0,0,0.25);
        --shadow-md: 0 4px 16px rgba(0,0,0,0.3);
      }
    }
  `;
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hinichi — エラー</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@700;900&display=swap" rel="stylesheet">
  <style>
    ${buildThemeCss()}
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes enter { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    ::selection { background: var(--accent); color: #fff; }
    body { font-family: var(--sans); color: var(--ink); background: var(--bg); margin: 0; padding: 0; min-height: 100vh; line-height: 1.7; -webkit-font-smoothing: antialiased; }
    .container { max-width: 780px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; animation: enter 0.5s ease-out; }
    header { text-align: center; padding: 1rem 0 2rem; margin-bottom: 2rem; position: relative; }
    header::before { content: ''; position: absolute; top: -10%; left: 50%; transform: translateX(-50%); width: 320px; height: 200px; background: radial-gradient(ellipse, var(--accent-glow) 0%, transparent 70%); pointer-events: none; z-index: 0; }
    header h1 { font-family: var(--serif); font-size: 3.2rem; font-weight: 900; margin: 0; letter-spacing: 0.25em; line-height: 1.2; position: relative; z-index: 1; }
    header h1::after { content: ''; display: block; width: 2.5rem; height: 2px; background: var(--accent); margin: 0.6rem auto 0; }
    .subtitle { display: block; font-family: var(--sans); font-weight: 400; font-size: 0.55rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--ink-muted); margin-top: 0.4rem; }
    .error-box { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 2rem; margin: 2rem 0; box-shadow: var(--shadow-md); position: relative; overflow: hidden; }
    .error-box::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--accent) 0%, transparent 100%); }
    .error-box h2 { font-family: var(--serif); font-size: 1.15rem; margin: 0 0 0.75rem; color: var(--accent); }
    .error-box p { color: var(--ink-secondary); line-height: 1.7; margin: 0 0 1rem; }
    .error-box a { color: var(--accent); text-decoration: none; transition: opacity 0.15s; }
    .error-box a:hover { opacity: 0.75; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>日日<span class="subtitle">hinichi</span></h1>
    </header>
    <div class="error-box">
      <h2>${esc(message)}</h2>
      ${detailsHtml}
      <p><a href="${escapeAttr(linkHref)}">${esc(linkLabel)}</a></p>
    </div>
  </div>
</body>
</html>`;
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
