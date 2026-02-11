import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { extractEntries } from "./entry-collector";
import { fetchArticleContents, type ArticleContent } from "./article-fetcher";
import { generateFeed } from "./feed-generator";
import { renderHtmlPage } from "./html-renderer";
import { CATEGORIES, type AISummaryResult, type Env } from "./types";

const app = new Hono<{ Bindings: Env }>();

const paramSchema = z.object({
  category: z.enum(CATEGORIES),
});

const querySchema = z.object({
  format: z.enum(["rss", "atom", "json", "html"]).default("rss"),
  date: z
    .string()
    .regex(/^\d{8}$/, "YYYYMMDD形式で指定してください")
    .optional(),
  summary: z.enum(["ai", "aiOnly"]).optional(),
  revalidate: z.enum(["true", "1"]).optional(),
});

function getYesterdayJST(): string {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(now.getTime() + jstOffset);
  const yesterday = new Date(jstNow.getTime() - 24 * 60 * 60 * 1000);
  const y = yesterday.getUTCFullYear();
  const m = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
  const d = String(yesterday.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatDateForDisplay(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

app.get("/", (c) => {
  return c.redirect("/all?format=html&summary=ai");
});

function buildCacheKey(baseUrl: string, category: string, dateParam: string, format: string, summaryParam?: string): string {
  const url = new URL(`/${category}`, baseUrl);
  url.searchParams.set("date", dateParam);
  url.searchParams.set("format", format);
  if (summaryParam) url.searchParams.set("summary", summaryParam);
  return url.toString();
}

app.get(
  "/:category",
  zValidator("param", paramSchema),
  zValidator("query", querySchema),
  async (c) => {
    const { category } = c.req.valid("param");
    const { format, date, summary: summaryParam, revalidate: revalidateParam } = c.req.valid("query");
    const dateParam = date || getYesterdayJST();
    const revalidate = revalidateParam != null;
    const wantSummary = summaryParam === "ai" || summaryParam === "aiOnly";
    const summaryOnly = summaryParam === "aiOnly";

    const baseUrl = new URL(c.req.url).origin;
    const cacheKey = buildCacheKey(baseUrl, category, dateParam, format, summaryParam);
    const cache = typeof caches !== "undefined" ? caches.default : null;

    if (!revalidate && cache) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    const hatenaUrl = `https://b.hatena.ne.jp/hotentry/${category}/${dateParam}`;
    const res = await fetch(hatenaUrl);

    if (!res.ok) {
      return c.json({ error: `failed to fetch: ${res.status}` }, 502);
    }

    const entries = await extractEntries(res);

    if (entries.length === 0) {
      return c.json({ error: "no entries found" }, 404);
    }

    const displayDate = formatDateForDisplay(dateParam);

    let aiSummary: AISummaryResult | undefined;
    if (wantSummary) {
      const articles = await fetchArticleContents(entries, {
        accountId: c.env.BROWSER_RENDERING_ACCOUNT_ID,
        apiToken: c.env.BROWSER_RENDERING_API_TOKEN,
      });
      aiSummary = await generateAISummary(c.env.GOOGLE_AI_API_KEY, articles);
    }

    let response: Response;

    if (format === "html") {
      response = c.html(
        renderHtmlPage(summaryOnly ? [] : entries, category, displayDate, {
          summary: aiSummary,
          currentFormat: format,
          currentSummary: summaryParam,
          currentDate: dateParam,
        }),
      );
    } else {
      const feed = summaryOnly
        ? generateFeed([], category, displayDate, baseUrl)
        : generateFeed(entries, category, displayDate, baseUrl);

      if (aiSummary) {
        const summaryHtml = buildSummaryHtml(aiSummary);
        feed.addItem({
          title: `[要約] ${displayDate} の ${category} まとめ`,
          id: `${baseUrl}/${category}/summary/${dateParam}`,
          link: `${baseUrl}/${category}?format=html&summary=ai&date=${dateParam}`,
          description: aiSummary.overview,
          content: summaryHtml,
          date: new Date(),
        });
      }

      const contentTypeMap = {
        rss: "application/rss+xml; charset=utf-8",
        atom: "application/atom+xml; charset=utf-8",
        json: "application/feed+json; charset=utf-8",
      } as const;

      const outputMap = {
        rss: () => feed.rss2(),
        atom: () => feed.atom1(),
        json: () => feed.json1(),
      } as const;

      response = new Response(outputMap[format](), {
        headers: { "Content-Type": contentTypeMap[format] },
      });
    }

    if (cache) {
      const body = await response.clone().text();
      const cacheResponse = new Response(body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers.entries()), "Cache-Control": "public, max-age=3600" },
      });
      c.executionCtx.waitUntil(cache.put(cacheKey, cacheResponse));
    }

    return response;
  },
);

const aiSummarySchema = z.object({
  overview: z.string().describe("全記事を俯瞰した日本語のトレンドまとめ（3-5文）"),
  articles: z.array(
    z.object({
      title: z.string().describe("記事タイトル"),
      url: z.string().describe("記事URL"),
      summary: z.string().describe("記事の本文内容に基づく具体的な要約（1-2文）"),
    }),
  ),
});

async function generateAISummary(apiKey: string, articles: ArticleContent[]): Promise<AISummaryResult> {
  const articleTexts = articles
    .slice(0, 20)
    .map(
      (a, i) =>
        `### ${i + 1}. ${a.entry.title} (${a.entry.users} users)\nURL: ${a.entry.url}\n本文: ${a.bodyText.slice(0, 500)}`,
    )
    .join("\n\n");

  const prompt = `以下ははてなブックマークの人気エントリー一覧とその本文抜粋です。

${articleTexts}

上記の記事群について:
- overviewは全記事を俯瞰した日本語のトレンドまとめ（3-5文）
- articlesは全記事分生成すること
- summaryは記事の本文内容に基づく具体的な要約（タイトルの繰り返しではなく、1-2文）`;

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const { object } = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: aiSummarySchema,
      prompt,
    });
    return object;
  } catch {
    /* AI呼び出し失敗時はフォールバック */
  }

  return buildFallbackSummary(articles);
}

function buildFallbackSummary(articles: ArticleContent[]): AISummaryResult {
  return {
    overview: `${articles.length}件の人気エントリーがあります。`,
    articles: articles.map((a) => ({
      title: a.entry.title,
      url: a.entry.url,
      summary: a.entry.description.slice(0, 100),
    })),
  };
}

function buildSummaryHtml(summary: AISummaryResult): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const articleListHtml = summary.articles
    .map((a) => `<li><a href="${esc(a.url)}">${esc(a.title)}</a>: ${esc(a.summary)}</li>`)
    .join("\n");

  return `<h3>今日のトレンド</h3>
<p>${esc(summary.overview)}</p>
<h3>記事サマリ</h3>
<ul>${articleListHtml}</ul>`;
}

export default app;
