import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "@hono/zod-validator";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { extractEntries } from "./entry-collector";
import { fetchArticleContents, type ArticleContent } from "./article-fetcher";
import { generateFeed } from "./feed-generator";
import { renderHtmlPage, renderErrorPage } from "./html-renderer";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  type AISummaryResult,
  type Category,
  type Env,
  type HatenaEntry,
} from "./types";

const app = new Hono<{ Bindings: Env }>();
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const CACHE_HEADERS_TO_STRIP = [
  "cache-control",
  "age",
  "expires",
  "last-modified",
  "etag",
] as const;
const DATA_CACHE_VERSION = "2";
const ENTRY_LOOKBACK_DAYS = 2;

type DataCacheKind = "entries" | "articles" | "ai-summary";

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

function subtractDays(yyyymmdd: string, days: number): string {
  const y = parseInt(yyyymmdd.slice(0, 4));
  const m = parseInt(yyyymmdd.slice(4, 6)) - 1;
  const d = parseInt(yyyymmdd.slice(6, 8));
  const date = new Date(Date.UTC(y, m, d) - days * 24 * 60 * 60 * 1000);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
}

async function fetchHatenaEntries(
  category: string,
  dateParam: string,
  allowRetry: boolean,
): Promise<{ entries: HatenaEntry[] | null; resolvedDate: string }> {
  const maxRetries = allowRetry ? 3 : 1;
  for (let i = 0; i < maxRetries; i++) {
    const tryDate = i === 0 ? dateParam : subtractDays(dateParam, i);
    const url = `https://b.hatena.ne.jp/hotentry/${category}/${tryDate}`;
    const res = await fetch(url);
    if (!res.ok) continue;
    const entries = await extractEntries(res);
    if (entries.length > 0) return { entries, resolvedDate: tryDate };
  }
  return { entries: null, resolvedDate: dateParam };
}

function buildCacheKey(
  baseUrl: string,
  category: string,
  dateParam: string,
  format: string,
  summaryParam?: string,
): string {
  const url = new URL(`/${category}`, baseUrl);
  url.searchParams.set("date", dateParam);
  url.searchParams.set("format", format);
  if (summaryParam) url.searchParams.set("summary", summaryParam);
  return url.toString();
}

function buildDataCacheKey(
  baseUrl: string,
  kind: DataCacheKind,
  category: string,
  dateParam: string,
): string {
  const url = new URL(`/__cache/${kind}`, baseUrl);
  url.searchParams.set("category", category);
  url.searchParams.set("date", dateParam);
  url.searchParams.set("v", DATA_CACHE_VERSION);
  return url.toString();
}

function buildKvKey(kind: DataCacheKind, category: string, date: string): string {
  return `v${DATA_CACHE_VERSION}:${kind}:${category}:${date}`;
}

interface DataCache {
  get<T>(kind: DataCacheKind, category: string, date: string): Promise<T | null>;
  put(kind: DataCacheKind, category: string, date: string, value: unknown): Promise<void>;
  delete(kind: DataCacheKind, category: string, date: string): Promise<void>;
}

function createDataCache(kv: KVNamespace | null, cache: Cache | null, baseUrl: string): DataCache {
  return {
    async get<T>(kind: DataCacheKind, category: string, date: string): Promise<T | null> {
      if (kv) {
        return kv.get<T>(buildKvKey(kind, category, date), "json");
      }
      if (cache) {
        return matchJsonCache<T>(cache, buildDataCacheKey(baseUrl, kind, category, date));
      }
      return null;
    },
    put(kind: DataCacheKind, category: string, date: string, value: unknown): Promise<void> {
      if (kv) {
        return kv.put(buildKvKey(kind, category, date), JSON.stringify(value), {
          expirationTtl: CACHE_TTL_SECONDS,
        });
      }
      if (cache) {
        return cache.put(
          buildDataCacheKey(baseUrl, kind, category, date),
          buildJsonCacheResponse(value),
        );
      }
      return Promise.resolve();
    },
    async delete(kind: DataCacheKind, category: string, date: string): Promise<void> {
      if (kv) {
        await kv.delete(buildKvKey(kind, category, date));
      } else if (cache) {
        await cache.delete(buildDataCacheKey(baseUrl, kind, category, date));
      }
    },
  };
}

function buildCacheControlHeader(): string {
  return `public, max-age=${CACHE_TTL_SECONDS}`;
}

function buildJsonCacheResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": buildCacheControlHeader(),
    },
  });
}

function resolveLookupDates(dateParam: string, allowRetry: boolean): string[] {
  if (!allowRetry) return [dateParam];
  return Array.from({ length: ENTRY_LOOKBACK_DAYS + 1 }, (_, i) => subtractDays(dateParam, i));
}

async function matchJsonCache<T>(cache: Cache, cacheKey: string): Promise<T | null> {
  const cached = await cache.match(cacheKey);
  if (!cached) return null;
  try {
    return (await cached.json()) as T;
  } catch {
    await cache.delete(cacheKey);
    return null;
  }
}

function buildClientResponseWithoutCacheHeaders(source: Response): Response {
  const headers = new Headers(source.headers);
  for (const headerName of CACHE_HEADERS_TO_STRIP) {
    headers.delete(headerName);
  }
  return new Response(source.body, {
    status: source.status,
    statusText: source.statusText,
    headers,
  });
}

interface ErrorResponseOptions {
  details?: string[];
  linkHref?: string;
  linkLabel?: string;
}

function getMissingAISummaryBindings(env: Env): string[] {
  const requiredBindings = [
    ["GOOGLE_AI_API_KEY", env.GOOGLE_AI_API_KEY],
    ["BROWSER_RENDERING_ACCOUNT_ID", env.BROWSER_RENDERING_ACCOUNT_ID],
    ["BROWSER_RENDERING_API_TOKEN", env.BROWSER_RENDERING_API_TOKEN],
  ] as const;

  return requiredBindings
    .filter(([, value]) => typeof value !== "string" || value.trim().length === 0)
    .map(([name]) => name);
}

app.get(
  "/:category",
  zValidator("param", paramSchema),
  zValidator("query", querySchema),
  async (c) => {
    const { category } = c.req.valid("param");
    const {
      format,
      date,
      summary: summaryParam,
      revalidate: revalidateParam,
    } = c.req.valid("query");
    const dateParam = date || getYesterdayJST();
    const revalidate = revalidateParam != null;
    const wantSummary = summaryParam === "ai" || summaryParam === "aiOnly";
    const summaryOnly = summaryParam === "aiOnly";

    if (wantSummary) {
      const missingBindings = getMissingAISummaryBindings(c.env);
      if (missingBindings.length > 0) {
        return buildErrorResponse(
          format,
          "AI要約の設定が不足しています",
          formatDateForDisplay(dateParam),
          category,
          500,
          {
            details: [
              `不足している環境変数: ${missingBindings.join(", ")}`,
              "Cloudflare環境変数を設定するか、summary パラメータを外してアクセスしてください。",
            ],
            linkHref: `/${category}?format=html&date=${dateParam}`,
            linkLabel: "AI要約なしで表示する",
          },
        );
      }
    }

    const baseUrl = new URL(c.req.url).origin;
    const cache = typeof caches !== "undefined" ? caches.default : null;
    const kv = c.env.CACHE_KV ?? null;
    const dataCache = createDataCache(kv, cache, baseUrl);
    const allowRetry = !date;

    if (date && cache && !revalidate) {
      const cacheKey = buildCacheKey(baseUrl, category, dateParam, format, summaryParam);
      const cached = await cache.match(cacheKey);
      if (cached) return buildClientResponseWithoutCacheHeaders(cached);
    }

    let entries: HatenaEntry[] | null = null;
    let effectiveDate = dateParam;
    let entriesFromCache = false;

    if (!revalidate) {
      for (const lookupDate of resolveLookupDates(dateParam, allowRetry)) {
        const cached = await dataCache.get<HatenaEntry[]>("entries", category, lookupDate);
        if (Array.isArray(cached) && cached.length > 0) {
          entries = cached;
          effectiveDate = lookupDate;
          entriesFromCache = true;
          break;
        }
      }
    }

    if (!entries) {
      const fetched = await fetchHatenaEntries(category, dateParam, allowRetry);
      entries = fetched.entries;
      effectiveDate = fetched.resolvedDate || dateParam;
    }

    const displayDate = formatDateForDisplay(effectiveDate);

    if (!entries || entries.length === 0) {
      const requestedDate = formatDateForDisplay(dateParam);
      const message = !entries ? "データの取得に失敗しました" : "エントリーが見つかりませんでした";
      const status = !entries ? 502 : 404;
      return buildErrorResponse(format, message, requestedDate, category, status);
    }

    const cacheKey = buildCacheKey(baseUrl, category, effectiveDate, format, summaryParam);

    if (cache && !revalidate) {
      const cached = await cache.match(cacheKey);
      if (cached) return buildClientResponseWithoutCacheHeaders(cached);
    }

    if (revalidate) {
      await Promise.all([
        dataCache.delete("entries", category, effectiveDate),
        dataCache.delete("articles", category, effectiveDate),
        dataCache.delete("ai-summary", category, effectiveDate),
        ...(cache ? [cache.delete(cacheKey)] : []),
      ]);
    }

    if (!entriesFromCache || revalidate) {
      c.executionCtx.waitUntil(dataCache.put("entries", category, effectiveDate, entries));
    }

    let aiSummary: AISummaryResult | undefined;
    if (wantSummary) {
      let articles: ArticleContent[] | null = null;
      let articlesFromCache = false;

      if (!revalidate) {
        const cached = await dataCache.get<ArticleContent[]>("articles", category, effectiveDate);
        if (Array.isArray(cached) && cached.length > 0) {
          articles = cached;
          articlesFromCache = true;
        }
      }

      if (!articles) {
        articles = await fetchArticleContents(entries, {
          accountId: c.env.BROWSER_RENDERING_ACCOUNT_ID,
          apiToken: c.env.BROWSER_RENDERING_API_TOKEN,
        });
      }

      if (!articlesFromCache || revalidate) {
        c.executionCtx.waitUntil(dataCache.put("articles", category, effectiveDate, articles));
      }

      let aiSummaryFromCache = false;
      if (!revalidate) {
        const cached = await dataCache.get<unknown>("ai-summary", category, effectiveDate);
        if (cached) {
          const parsed = aiSummarySchema.safeParse(cached);
          if (parsed.success) {
            aiSummary = parsed.data;
            aiSummaryFromCache = true;
          } else {
            c.executionCtx.waitUntil(dataCache.delete("ai-summary", category, effectiveDate));
          }
        }
      }

      if (!aiSummary) {
        aiSummary = await generateAISummary(c.env.GOOGLE_AI_API_KEY, articles, displayDate);
      }

      if (!aiSummaryFromCache || revalidate) {
        c.executionCtx.waitUntil(dataCache.put("ai-summary", category, effectiveDate, aiSummary));
      }
    }

    let response: Response;

    if (format === "html") {
      response = c.html(
        renderHtmlPage(summaryOnly ? [] : entries, category, displayDate, {
          summary: aiSummary,
          currentFormat: format,
          currentSummary: summaryParam,
          currentDate: date ? dateParam : effectiveDate,
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
          id: `${baseUrl}/${category}/summary/${effectiveDate}`,
          link: `${baseUrl}/${category}?format=html&summary=ai&date=${effectiveDate}`,
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
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          "Cache-Control": buildCacheControlHeader(),
        },
      });
      c.executionCtx.waitUntil(cache.put(cacheKey, cacheResponse));
    }

    return response;
  },
);

function buildErrorResponse(
  format: string,
  message: string,
  dateStr: string,
  category: Category,
  status: number,
  options: ErrorResponseOptions = {},
): Response {
  if (format === "html") {
    return new Response(
      renderErrorPage(message, dateStr, category, {
        details: options.details,
        linkHref: options.linkHref,
        linkLabel: options.linkLabel,
      }),
      {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      },
    );
  }

  if (format === "json") {
    const payload: {
      error: string;
      date: string;
      category: Category;
      details?: string[];
    } = {
      error: message,
      date: dateStr,
      category,
    };
    if (options.details) {
      payload.details = options.details;
    }
    return new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }

  const feed = generateFeed([], category, dateStr, "");
  feed.addItem({
    title: message,
    id: `error-${category}-${dateStr}`,
    link: `https://b.hatena.ne.jp/hotentry/${category}`,
    description: options.details?.length
      ? `${CATEGORY_LABELS[category]} (${dateStr}): ${message}\n${options.details.join(" / ")}`
      : `${CATEGORY_LABELS[category]} (${dateStr}): ${message}`,
    date: new Date(),
  });

  const contentType =
    format === "atom"
      ? "application/atom+xml; charset=utf-8"
      : "application/rss+xml; charset=utf-8";
  const output = format === "atom" ? feed.atom1() : feed.rss2();

  return new Response(output, { status, headers: { "Content-Type": contentType } });
}

const aiSummarySchema = z.object({
  overview: z.string().describe("全記事を俯瞰した日本語の概要（3-5文。共通するテーマがあればまとめ、なければジャンルごとに簡潔に紹介する。「○月のトレンド」のような断定的なフレーミングは避ける）"),
  articles: z.array(
    z.object({
      title: z.string().describe("記事タイトル"),
      url: z.string().describe("記事URL"),
      summary: z.string().describe("記事の本文内容に基づく具体的な要約（1-2文）"),
    }),
  ),
});

async function generateAISummary(
  apiKey: string,
  articles: ArticleContent[],
  dateStr: string,
): Promise<AISummaryResult> {
  const articleTexts = articles
    .slice(0, 20)
    .map(
      (a, i) =>
        `### ${i + 1}. ${a.entry.title} (${a.entry.users} users)\nURL: ${a.entry.url}\n本文: ${a.bodyText.slice(0, 500)}`,
    )
    .join("\n\n");

  const prompt = `今日は${dateStr}です。以下ははてなブックマークの人気エントリー一覧とその本文抜粋です。

${articleTexts}

上記の記事群について:
- overviewは全記事を俯瞰した日本語の概要（3-5文）。共通するテーマがあればまとめ、なければジャンルごとに簡潔に紹介する。これらは単にその日の人気記事であり、必ずしも一つのトレンドを示すものではないため、「○月のトレンドは〜」のような断定的なフレーミングは避けること
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
