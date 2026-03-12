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

  const heroEntry = entries.length > 0 ? entries[0] : null;
  const gridEntries = entries.slice(1);

  const heroHtml = heroEntry ? buildHeroCard(heroEntry) : "";
  const gridHtml = gridEntries.map((e, i) => buildGridCard(e, i)).join("\n");

  const categoryOptions = CATEGORIES.map(
    (c) =>
      `<option value="${c}"${c === category ? " selected" : ""}>${esc(CATEGORY_LABELS[c])}</option>`,
  ).join("\n            ");

  const formatOptions = ["html", "rss", "atom", "json"]
    .map(
      (f) =>
        `<option value="${f}"${f === options.currentFormat ? " selected" : ""}>${f.toUpperCase()}</option>`,
    )
    .join("\n            ");

  const summaryOptions = [
    { value: "", label: "なし" },
    { value: "ai", label: "要約付き" },
    { value: "aiOnly", label: "要約のみ" },
  ]
    .map(
      (s) =>
        `<option value="${s.value}"${s.value === (options.currentSummary || "") ? " selected" : ""}>${s.label}</option>`,
    )
    .join("\n            ");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    ${buildThemeCss()}

    *, *::before, *::after { box-sizing: border-box; }
    @keyframes cardIn { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes mesh { to { --a1: 360deg; --a2: 480deg; } }
    ::selection { background: var(--accent); color: #fff; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    body { font-family: var(--sans); color: var(--ink); background: var(--bg); margin: 0; padding: 0; min-height: 100vh; line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }

    .mesh { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: conic-gradient(from var(--a1) at 25% 30%, var(--glow-1) 0%, transparent 18%), conic-gradient(from var(--a2) at 75% 65%, var(--glow-2) 0%, transparent 18%); animation: mesh 30s linear infinite; filter: blur(90px); }
    .grain { position: fixed; inset: 0; z-index: 9998; pointer-events: none; opacity: 0.30; mix-blend-mode: overlay; background-repeat: repeat; }

    .container { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; animation: fadeIn 0.4s ease-out; }

    header { text-align: center; padding: 1.5rem 0 1rem; margin-bottom: 1.5rem; }
    header h1 { font-family: var(--display); font-size: 4rem; margin: 0; letter-spacing: 0.08em; line-height: 1; background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .tagline { font-family: var(--sans); font-size: 0.58rem; letter-spacing: 0.4em; text-transform: uppercase; color: var(--ink-muted); margin: 0.4rem 0 0; font-weight: 500; }
    header .date { font-size: 0.8rem; color: var(--ink-muted); margin-top: 0.5rem; }
    header .date a { color: inherit; text-decoration: none; transition: color 0.2s; }
    header .date a:hover { color: var(--accent); }

    .toolbar { display: flex; align-items: flex-end; flex-wrap: wrap; gap: 0.6rem; margin-bottom: 2rem; padding: 0.75rem 1rem; background: var(--bg-glass); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-sm); }
    .toolbar label { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-muted); font-weight: 500; }
    .toolbar select, .toolbar input[type="date"] { font-family: var(--sans); font-size: 0.8rem; padding: 0.4rem 0.65rem; border: 1px solid var(--border); border-radius: 20px; background: var(--bg-card); color: var(--ink); cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
    .toolbar select { appearance: none; padding-right: 1.6rem; background-image: linear-gradient(45deg, transparent 50%, var(--ink-muted) 50%), linear-gradient(135deg, var(--ink-muted) 50%, transparent 50%); background-position: calc(100% - 0.9rem) calc(50% - 0.1rem), calc(100% - 0.6rem) calc(50% - 0.1rem); background-size: 0.26rem 0.26rem; background-repeat: no-repeat; }
    .toolbar select:focus, .toolbar input[type="date"]:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--glow-1); }
    .toolbar-links { margin-left: auto; display: flex; gap: 0.3rem; align-items: center; }
    .toolbar-links a, .revalidate-btn { font-family: var(--sans); font-size: 0.7rem; padding: 0.35rem 0.6rem; border: 1px solid var(--border); border-radius: 20px; color: var(--ink-muted); text-decoration: none; background: var(--bg-card); cursor: pointer; transition: all 0.2s; }
    .toolbar-links a:hover, .revalidate-btn:hover { border-color: var(--accent); color: var(--accent); }
    .revalidate-btn.loading { opacity: 0.5; pointer-events: none; }

    .summary { background: var(--bg-card); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; margin-bottom: 2rem; box-shadow: var(--shadow-md); position: relative; overflow: hidden; }
    .summary::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--accent), var(--accent-secondary)); }
    .summary-header { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.75rem; }
    .summary-header h2 { font-family: var(--sans); font-size: 1rem; font-weight: 700; margin: 0; letter-spacing: 0.04em; }
    .copy-btn { font-family: var(--sans); font-size: 0.68rem; color: var(--ink-muted); background: transparent; border: 1px solid var(--border); border-radius: 20px; padding: 0.2rem 0.6rem; cursor: pointer; transition: all 0.2s; }
    .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
    .copy-btn.copied { border-color: var(--success); color: var(--success); }
    .summary .overview { font-size: 0.9rem; line-height: 1.8; color: var(--ink-secondary); margin-bottom: 1rem; }
    .summary h3 { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink-muted); margin: 1rem 0 0.6rem; border-bottom: 1px solid var(--border); padding-bottom: 0.4rem; }
    .summary ul { list-style: none; padding: 0; margin: 0; }
    .summary li { padding: 0.45rem 0; border-bottom: 1px solid var(--border); line-height: 1.6; }
    .summary li:last-child { border-bottom: none; }
    .summary li a { color: var(--ink); text-decoration: none; font-weight: 500; font-size: 0.85rem; transition: color 0.15s; }
    .summary li a:hover { color: var(--accent); }
    .article-summary { display: block; font-size: 0.78rem; color: var(--ink-muted); margin-top: 0.1rem; }

    .hero { position: relative; border-radius: 16px; overflow: hidden; margin-bottom: 2rem; box-shadow: var(--shadow-lg); min-height: 320px; display: flex; cursor: default; transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .hero:not(:has(.hero-img)) { background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); }
    .hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 6s ease-out; }
    .hero:hover .hero-img { transform: scale(1.04); }
    .hero-content { position: relative; z-index: 1; padding: 2.5rem; width: 100%; display: flex; flex-direction: column; justify-content: flex-end; min-height: 320px; background: linear-gradient(0deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.05) 100%); color: #fff; }
    .hero:not(:has(.hero-img)) .hero-content { background: none; }
    .hero-content .meta { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.5rem; }
    .hero-content .users { font-size: 0.7rem; font-weight: 700; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); color: #fff; padding: 0.15rem 0.55rem; border-radius: 20px; }
    .hero-content .domain { font-size: 0.75rem; color: rgba(255,255,255,0.7); }
    .hero-content h2 { font-family: var(--sans); font-size: 1.6rem; font-weight: 700; margin: 0; line-height: 1.4; }
    .hero-content h2 a { color: #fff; text-decoration: none; }
    .hero-content p { color: rgba(255,255,255,0.8); margin: 0.4rem 0 0; font-size: 0.88rem; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .hero-content .tags { display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.6rem; }
    .hero-content .tags span { font-size: 0.65rem; color: rgba(255,255,255,0.75); border: 1px solid rgba(255,255,255,0.25); padding: 0.1rem 0.45rem; border-radius: 20px; }

    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }

    .card { background: var(--bg-card); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; box-shadow: var(--shadow-sm); opacity: 0; transform: translateY(28px); cursor: default; will-change: transform, opacity; }
    .card.in { opacity: 1; transform: none; transition: opacity 0.5s ease, transform 0.5s ease, box-shadow 0.3s ease; }
    .card-img { width: 100%; height: 160px; object-fit: cover; display: block; transition: transform 0.5s ease; }
    .card:hover .card-img { transform: scale(1.06); }
    .card-body { padding: 1.1rem 1.25rem; }
    .card-body .meta { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.3rem; }
    .card-body .users { font-size: 0.65rem; font-weight: 700; color: var(--accent); background: var(--accent-badge); padding: 0.1rem 0.45rem; border-radius: 20px; }
    .card-body .domain { font-size: 0.72rem; color: var(--ink-muted); }
    .card-body h3 { font-family: var(--sans); font-size: 0.92rem; font-weight: 700; margin: 0 0 0.3rem; line-height: 1.5; }
    .card-body h3 a { color: var(--ink); text-decoration: none; transition: color 0.15s; }
    .card-body h3 a:hover { color: var(--accent); }
    .card-body p { font-size: 0.82rem; color: var(--ink-secondary); margin: 0.25rem 0 0; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .card-body .tags { display: flex; gap: 0.25rem; flex-wrap: wrap; margin-top: 0.45rem; }
    .card-body .tags span { font-size: 0.62rem; color: var(--ink-muted); border: 1px solid var(--tag-border); padding: 0.08rem 0.4rem; border-radius: 20px; background: transparent; transition: all 0.15s; cursor: default; }
    .card-body .tags span:hover { background: var(--tag-hover); color: var(--ink-secondary); }

    footer { margin-top: 3rem; padding: 1.25rem 0; border-top: 1px solid var(--border); text-align: center; font-size: 0.65rem; color: var(--ink-muted); letter-spacing: 0.12em; }
  </style>
</head>
<body>
  <div class="mesh" aria-hidden="true"></div>
  <div class="grain" aria-hidden="true"></div>
  <div class="container">
    <header>
      <h1>日日</h1>
      <p class="tagline">hinichi</p>
      <div class="date"><a href="${escapeAttr(hotentryUrl)}">${esc(label)} — ${esc(dateStr)}</a></div>
    </header>
    <nav class="toolbar">
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
      <label>要約
        <select id="sel-summary">
          ${summaryOptions}
        </select>
      </label>
      <div class="toolbar-links">
        <a href="/${category}?format=rss${options.currentSummary ? "&summary=" + options.currentSummary : ""}&date=${options.currentDate}">RSS</a>
        <a href="/${category}?format=atom${options.currentSummary ? "&summary=" + options.currentSummary : ""}&date=${options.currentDate}">Atom</a>
        <a href="/${category}?format=json${options.currentSummary ? "&summary=" + options.currentSummary : ""}&date=${options.currentDate}">JSON</a>
        <button class="revalidate-btn" id="btn-revalidate" title="キャッシュを破棄して再取得">↻</button>
      </div>
    </nav>
    ${summarySection}
    ${heroHtml}
    <div class="grid">
      ${gridHtml}
    </div>
    <footer>hinichi — はてなブックマーク デイリーダイジェスト</footer>
  </div>
  <script>
    /* grain texture */
    (function(){var s=150,c=document.createElement('canvas');c.width=c.height=s;var x=c.getContext('2d'),d=x.createImageData(s,s),p=d.data;for(var i=0;i<p.length;i+=4){var v=Math.random()*255;p[i]=p[i+1]=p[i+2]=v;p[i+3]=16;}x.putImageData(d,0,0);var g=document.querySelector('.grain');if(g)g.style.backgroundImage='url('+c.toDataURL()+')';})();

    /* scroll-triggered entrance */
    (function(){var delay=0;var obs=new IntersectionObserver(function(entries){delay=0;entries.forEach(function(e){if(e.isIntersecting){(function(el,d){setTimeout(function(){el.classList.add('in');},d);})(e.target,delay);delay+=70;obs.unobserve(e.target);}});},{threshold:0.06,rootMargin:'0px 0px -30px 0px'});document.querySelectorAll('.card').forEach(function(el){obs.observe(el);});})();

    /* 3d tilt on hover */
    (function(){if(window.matchMedia('(hover:hover)').matches){document.querySelectorAll('.card.in,.hero').forEach(function(el){el.addEventListener('mousemove',function(ev){var r=this.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;this.style.transform='perspective(600px) rotateY('+(x*5)+'deg) rotateX('+(-y*5)+'deg) translateY(-2px)';});el.addEventListener('mouseleave',function(){this.style.transform='';});});}
    /* re-bind tilt when cards enter */
    var mo=new MutationObserver(function(muts){muts.forEach(function(m){if(m.type==='attributes'&&m.target.classList.contains('in')&&window.matchMedia('(hover:hover)').matches){var el=m.target;el.addEventListener('mousemove',function(ev){var r=this.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;this.style.transform='perspective(600px) rotateY('+(x*5)+'deg) rotateX('+(-y*5)+'deg) translateY(-2px)';});el.addEventListener('mouseleave',function(){this.style.transform='';});}});});document.querySelectorAll('.card').forEach(function(el){mo.observe(el,{attributes:true,attributeFilter:['class']});});})();

    /* navigation */
    function navigate(){var c=document.getElementById('sel-category').value,d=document.getElementById('sel-date').value.replace(/-/g,''),f=document.getElementById('sel-format').value,s=document.getElementById('sel-summary').value,p=new URLSearchParams();p.set('format',f);p.set('date',d);if(s)p.set('summary',s);window.location.href='/'+c+'?'+p.toString();}
    document.getElementById('sel-category').addEventListener('change',navigate);
    document.getElementById('sel-date').addEventListener('change',navigate);
    document.getElementById('sel-format').addEventListener('change',navigate);
    document.getElementById('sel-summary').addEventListener('change',navigate);
    document.getElementById('btn-revalidate').addEventListener('click',function(){var b=this;b.textContent='…';b.classList.add('loading');var p=new URLSearchParams(window.location.search);p.set('revalidate','true');window.location.href=window.location.pathname+'?'+p.toString();});
  </script>
</body>
</html>`;
}

function buildHeroCard(e: HatenaEntry): string {
  const img = e.imageUrl
    ? `<img class="hero-img" src="${escapeAttr(e.imageUrl)}" alt="" loading="eager" onerror="this.remove()" />`
    : "";
  const tags =
    e.tags.length > 0
      ? `<div class="tags">${e.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`
      : "";
  return `<article class="hero">
      ${img}
      <div class="hero-content">
        <div class="meta">
          <span class="users">${e.users} users</span>
          <span class="domain">${esc(e.domain)}</span>
        </div>
        <h2><a href="${escapeAttr(e.url)}">${esc(e.title)}</a></h2>
        ${e.description ? `<p>${esc(e.description)}</p>` : ""}
        ${tags}
      </div>
    </article>`;
}

function buildGridCard(e: HatenaEntry, index: number): string {
  const img = e.imageUrl
    ? `<img class="card-img" src="${escapeAttr(e.imageUrl)}" alt="" loading="lazy" onerror="this.remove()" />`
    : "";
  const tags =
    e.tags.length > 0
      ? `<div class="tags">${e.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`
      : "";
  return `<article class="card" style="--i:${index}">
        ${img}
        <div class="card-body">
          <div class="meta">
            <span class="users">${e.users} users</span>
            <span class="domain">${esc(e.domain)}</span>
          </div>
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
    @property --a1 { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
    @property --a2 { syntax: '<angle>'; initial-value: 120deg; inherits: false; }

    :root {
      color-scheme: light dark;

      --ink: #0f172a;
      --ink-secondary: #334155;
      --ink-muted: #64748b;

      --bg: #f8fafc;
      --bg-card: rgba(255, 255, 255, 0.78);
      --bg-glass: rgba(248, 250, 252, 0.65);

      --border: #e2e8f0;
      --accent: #0ea5e9;
      --accent-secondary: #6366f1;
      --accent-badge: rgba(14, 165, 233, 0.1);
      --glow-1: rgba(14, 165, 233, 0.12);
      --glow-2: rgba(99, 102, 241, 0.1);

      --tag-border: #cbd5e1;
      --tag-hover: #f1f5f9;
      --success: #22c55e;

      --shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
      --shadow-md: 0 4px 20px rgba(0,0,0,0.07);
      --shadow-lg: 0 16px 48px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05);

      --display: 'Dela Gothic One', sans-serif;
      --sans: 'Zen Kaku Gothic New', sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --ink: #f1f5f9;
        --ink-secondary: #cbd5e1;
        --ink-muted: #64748b;

        --bg: #020617;
        --bg-card: rgba(15, 23, 42, 0.78);
        --bg-glass: rgba(2, 6, 23, 0.65);

        --border: #1e293b;
        --accent: #38bdf8;
        --accent-secondary: #818cf8;
        --accent-badge: rgba(56, 189, 248, 0.12);
        --glow-1: rgba(56, 189, 248, 0.08);
        --glow-2: rgba(129, 140, 248, 0.06);

        --tag-border: #334155;
        --tag-hover: #1e293b;
        --success: #4ade80;

        --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
        --shadow-md: 0 4px 20px rgba(0,0,0,0.4);
        --shadow-lg: 0 16px 48px rgba(0,0,0,0.5);
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
  <link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    ${buildThemeCss()}
    *, *::before, *::after { box-sizing: border-box; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes mesh { to { --a1: 360deg; --a2: 480deg; } }
    ::selection { background: var(--accent); color: #fff; }
    body { font-family: var(--sans); color: var(--ink); background: var(--bg); margin: 0; padding: 0; min-height: 100vh; line-height: 1.7; -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    .mesh { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: conic-gradient(from var(--a1) at 25% 30%, var(--glow-1) 0%, transparent 18%), conic-gradient(from var(--a2) at 75% 65%, var(--glow-2) 0%, transparent 18%); animation: mesh 30s linear infinite; filter: blur(90px); }
    .container { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem 4rem; animation: fadeIn 0.4s ease-out; }
    header { text-align: center; padding: 1.5rem 0 1rem; margin-bottom: 2rem; }
    header h1 { font-family: var(--display); font-size: 4rem; margin: 0; letter-spacing: 0.08em; line-height: 1; background: linear-gradient(135deg, var(--accent), var(--accent-secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .tagline { font-family: var(--sans); font-size: 0.58rem; letter-spacing: 0.4em; text-transform: uppercase; color: var(--ink-muted); margin: 0.4rem 0 0; font-weight: 500; }
    .error-box { background: var(--bg-card); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; margin: 2rem 0; box-shadow: var(--shadow-md); position: relative; overflow: hidden; }
    .error-box::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--accent), var(--accent-secondary)); }
    .error-box h2 { font-family: var(--sans); font-size: 1.1rem; font-weight: 700; margin: 0 0 0.75rem; color: var(--accent); }
    .error-box p { color: var(--ink-secondary); line-height: 1.7; margin: 0 0 1rem; }
    .error-box a { color: var(--accent); text-decoration: none; transition: opacity 0.15s; }
    .error-box a:hover { opacity: 0.75; }
  </style>
</head>
<body>
  <div class="mesh" aria-hidden="true"></div>
  <div class="container">
    <header>
      <h1>日日</h1>
      <p class="tagline">hinichi</p>
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
