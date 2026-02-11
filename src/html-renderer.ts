import type { AISummaryResult, HatenaEntry, Category } from "./types";
import { CATEGORY_LABELS } from "./types";

export function renderHtmlPage(
  entries: HatenaEntry[],
  category: Category,
  dateStr: string,
  summary?: AISummaryResult,
): string {
  const label = CATEGORY_LABELS[category];
  const title = `はてなブックマーク - ${label} - ${dateStr}`;

  const summarySection = summary ? buildSummarySection(summary) : "";

  const entriesHtml = entries
    .map(
      (e) => `
    <article>
      <h3><a href="${escapeAttr(e.url)}">${esc(e.title)}</a></h3>
      <span class="users">${e.users} users</span>
      <span class="domain">${esc(e.domain)}</span>
      <p>${esc(e.description)}</p>
      ${e.tags.length > 0 ? `<div class="tags">${e.tags.map((t) => `<span>${esc(t)}</span>`).join(" ")}</div>` : ""}
    </article>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 1rem; }
    article { border-bottom: 1px solid #eee; padding: 1rem 0; }
    h3 { margin: 0 0 0.5rem; }
    h3 a { color: #1a0dab; text-decoration: none; }
    h3 a:hover { text-decoration: underline; }
    .users { background: #ff6600; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.85rem; }
    .domain { color: #666; font-size: 0.85rem; margin-left: 0.5rem; }
    .tags span { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.8rem; margin-right: 4px; }
    .summary { background: #f8f9fa; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid #e9ecef; }
    .summary h2 { margin-top: 0; }
    .summary .overview { font-size: 1.05rem; line-height: 1.6; margin-bottom: 1rem; }
    .summary ul { padding-left: 1.2rem; }
    .summary li { margin-bottom: 0.5rem; line-height: 1.5; }
    .summary li a { color: #1a0dab; text-decoration: none; font-weight: 500; }
    .summary li a:hover { text-decoration: underline; }
    .summary .article-summary { color: #555; }
    .summary-header { display: flex; align-items: center; justify-content: space-between; }
    .copy-btn { background: #e9ecef; border: 1px solid #ced4da; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 0.85rem; color: #495057; }
    .copy-btn:hover { background: #dee2e6; }
    .copy-btn.copied { background: #d4edda; border-color: #c3e6cb; color: #155724; }
    nav { margin-bottom: 1rem; }
    nav a { margin-right: 1rem; }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <nav>
    <a href="/${category}?format=rss">RSS</a>
    <a href="/${category}?format=atom">Atom</a>
    <a href="/${category}?format=json">JSON Feed</a>
  </nav>
  ${summarySection}
  ${entriesHtml}
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
