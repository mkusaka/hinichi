import type { HatenaEntry } from "./types";

export interface ArticleContent {
  entry: HatenaEntry;
  bodyText: string;
}

const CONTENT_SELECTORS = "p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, dd, dt";
const MAX_BODY_LENGTH = 3000;

async function fetchArticleBody(url: string, timeoutMs = 5000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "hatena-daily-rss/1.0" },
      signal: controller.signal,
    });
    if (!res.ok) return "";

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return "";

    const chunks: string[] = [];
    let totalLength = 0;

    const rewriter = new HTMLRewriter().on(CONTENT_SELECTORS, {
      text(t) {
        if (totalLength >= MAX_BODY_LENGTH) return;
        const trimmed = t.text.trim();
        if (trimmed) {
          chunks.push(trimmed);
          totalLength += trimmed.length;
        }
      },
    });

    const transformed = rewriter.transform(res);
    await transformed.arrayBuffer();
    clearTimeout(timer);

    return chunks.join(" ").slice(0, MAX_BODY_LENGTH);
  } catch {
    clearTimeout(timer);
    return "";
  }
}

export async function fetchArticleContents(
  entries: HatenaEntry[],
  maxArticles = 20,
): Promise<ArticleContent[]> {
  const targets = entries.slice(0, maxArticles);

  const results = await Promise.allSettled(
    targets.map(async (entry) => {
      const bodyText = await fetchArticleBody(entry.url);
      return {
        entry,
        bodyText: bodyText || entry.description,
      };
    }),
  );

  return results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { entry: targets[i], bodyText: targets[i].description };
  });
}
