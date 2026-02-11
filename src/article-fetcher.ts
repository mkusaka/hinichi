import type { HatenaEntry } from "./types";

export interface ArticleContent {
  entry: HatenaEntry;
  bodyText: string;
}

const MAX_BODY_LENGTH = 3000;

interface BrowserRenderingConfig {
  accountId: string;
  apiToken: string;
}

async function fetchMarkdownViaRendering(url: string, config: BrowserRenderingConfig): Promise<string> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/browser-rendering/markdown`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({ url }),
    },
  );

  if (!res.ok) return "";

  const data = (await res.json()) as {
    success: boolean;
    result?: string;
  };

  if (data.success && data.result) {
    return data.result.slice(0, MAX_BODY_LENGTH);
  }
  return "";
}

export async function fetchArticleContents(
  entries: HatenaEntry[],
  config: BrowserRenderingConfig,
  maxArticles = 20,
): Promise<ArticleContent[]> {
  const targets = entries.slice(0, maxArticles);

  const results = await Promise.allSettled(
    targets.map(async (entry) => {
      const bodyText = await fetchMarkdownViaRendering(entry.url, config);
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
