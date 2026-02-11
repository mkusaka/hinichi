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

  const summarySection = options.summary ? buildSummarySection(options.summary) : "";

  const entriesHtml = entries
    .map(
      (e) => `
      <article>
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
    (c) => `<option value="${c}"${c === category ? " selected" : ""}>${esc(CATEGORY_LABELS[c])}</option>`,
  ).join("\n        ");

  const formatOptions = ["html", "rss", "atom", "json"]
    .map((f) => `<option value="${f}"${f === options.currentFormat ? " selected" : ""}>${f.toUpperCase()}</option>`)
    .join("\n        ");

  const summaryOptions = [
    { value: "", label: "なし" },
    { value: "ai", label: "AI サマリ付き" },
    { value: "aiOnly", label: "AI サマリのみ" },
  ]
    .map((s) => `<option value="${s.value}"${s.value === (options.currentSummary || "") ? " selected" : ""}>${s.label}</option>`)
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@700&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #1a1a1a;
      --ink-light: #555;
      --ink-muted: #888;
      --bg: #fafaf8;
      --bg-card: #fff;
      --border: #e0ddd8;
      --accent: #c0392b;
      --accent-soft: #fdf2f0;
      --tag-bg: #f0eeea;
      --serif: 'Noto Serif JP', serif;
      --sans: 'Noto Sans JP', sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: var(--sans); color: var(--ink); background: var(--bg); margin: 0; padding: 0; line-height: 1.7; -webkit-font-smoothing: antialiased; }
    .container { max-width: 780px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }

    header { border-bottom: 3px double var(--border); padding-bottom: 1.25rem; margin-bottom: 1.5rem; }
    header h1 { font-family: var(--serif); font-size: 1.75rem; font-weight: 700; margin: 0 0 0.25rem; letter-spacing: 0.02em; }
    header .date { font-size: 0.85rem; color: var(--ink-muted); }

    .controls { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 2rem; }
    .controls label { font-size: 0.8rem; color: var(--ink-muted); display: flex; flex-direction: column; gap: 0.25rem; }
    .controls select { font-family: var(--sans); font-size: 0.85rem; padding: 0.4rem 0.6rem; border: 1px solid var(--border); border-radius: 3px; background: var(--bg-card); color: var(--ink); cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 0.5rem center; padding-right: 1.5rem; }
    .controls select:focus { outline: none; border-color: var(--accent); }
    .feed-links { margin-left: auto; display: flex; gap: 0.5rem; }
    .feed-links a { font-size: 0.75rem; color: var(--ink-muted); text-decoration: none; border: 1px solid var(--border); border-radius: 3px; padding: 0.3rem 0.5rem; transition: border-color 0.15s, color 0.15s; }
    .feed-links a:hover { border-color: var(--accent); color: var(--accent); }

    .summary { background: var(--bg-card); border: 1px solid var(--border); border-left: 4px solid var(--accent); padding: 1.5rem 1.75rem; margin-bottom: 2.5rem; }
    .summary-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.75rem; }
    .summary-header h2 { font-family: var(--serif); font-size: 1.15rem; margin: 0; letter-spacing: 0.02em; }
    .copy-btn { font-family: var(--sans); font-size: 0.75rem; color: var(--ink-muted); background: none; border: 1px solid var(--border); border-radius: 3px; padding: 0.25rem 0.6rem; cursor: pointer; transition: all 0.15s; }
    .copy-btn:hover { border-color: var(--ink-light); color: var(--ink-light); }
    .copy-btn.copied { border-color: #27ae60; color: #27ae60; }
    .summary .overview { font-size: 0.95rem; line-height: 1.8; color: var(--ink-light); margin-bottom: 1.25rem; }
    .summary h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--ink-muted); margin: 1.25rem 0 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
    .summary ul { list-style: none; padding: 0; margin: 0; }
    .summary li { padding: 0.5rem 0; border-bottom: 1px solid #f0eeea; line-height: 1.6; }
    .summary li:last-child { border-bottom: none; }
    .summary li a { color: var(--ink); text-decoration: none; font-weight: 500; font-size: 0.9rem; }
    .summary li a:hover { color: var(--accent); }
    .article-summary { display: block; font-size: 0.82rem; color: var(--ink-muted); margin-top: 0.15rem; }

    .entries { display: flex; flex-direction: column; gap: 0; }
    article { padding: 1.25rem 0; border-bottom: 1px solid var(--border); }
    article:first-child { padding-top: 0; }
    article h3 { font-family: var(--serif); font-size: 1.05rem; font-weight: 700; margin: 0 0 0.4rem; line-height: 1.5; }
    article h3 a { color: var(--ink); text-decoration: none; transition: color 0.15s; }
    article h3 a:hover { color: var(--accent); }
    .meta { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem; flex-wrap: wrap; }
    .users { font-size: 0.78rem; font-weight: 700; color: var(--accent); }
    .domain { font-size: 0.78rem; color: var(--ink-muted); }
    article p { font-size: 0.88rem; color: var(--ink-light); margin: 0.4rem 0 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.5rem; }
    .tags span { font-size: 0.72rem; color: var(--ink-muted); background: var(--tag-bg); padding: 0.15rem 0.45rem; border-radius: 2px; }

    footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--ink-muted); text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>日日 <span style="font-family: var(--sans); font-weight: 400; font-size: 0.6em; color: var(--ink-muted);">hinichi</span></h1>
      <div class="date">${esc(label)} — ${esc(dateStr)}</div>
    </header>
    <div class="controls">
      <label>カテゴリ
        <select id="sel-category">
          ${categoryOptions}
        </select>
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
      var fmt = document.getElementById('sel-format').value;
      var sum = document.getElementById('sel-summary').value;
      var params = new URLSearchParams();
      params.set('format', fmt);
      params.set('date', '${options.currentDate}');
      if (sum) params.set('summary', sum);
      window.location.href = '/' + cat + '?' + params.toString();
    }
    document.getElementById('sel-category').addEventListener('change', navigate);
    document.getElementById('sel-format').addEventListener('change', navigate);
    document.getElementById('sel-summary').addEventListener('change', navigate);
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
      <h2>AI サマリ</h2>
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
