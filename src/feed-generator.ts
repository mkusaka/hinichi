import { Feed } from "feed";
import type { HatenaEntry, Category } from "./types";
import { CATEGORY_LABELS } from "./types";

type FeedOutputFormat = "atom" | "rss" | "json";

interface FeedOptions {
  feedId?: string;
  feedLinks?: Partial<Record<FeedOutputFormat, string>>;
  updated?: Date;
}

export function generateFeed(
  entries: HatenaEntry[],
  category: Category,
  dateStr: string,
  baseUrl: string,
  options: FeedOptions = {},
): Feed {
  const label = CATEGORY_LABELS[category];
  const defaultFeedUrl = `${baseUrl}/${category}`;
  const feedId = options.feedId ?? defaultFeedUrl;
  const feedLinks = {
    atom: `${defaultFeedUrl}?format=atom`,
    rss: `${defaultFeedUrl}?format=rss`,
    json: `${defaultFeedUrl}?format=json`,
    ...options.feedLinks,
  };

  const feed = new Feed({
    title: `はてなブックマーク - ${label} - ${dateStr}`,
    description: `はてなブックマーク ${label} カテゴリの人気エントリー（${dateStr}）`,
    id: feedId,
    link: `https://b.hatena.ne.jp/hotentry/${category}/${dateStr.replace(/-/g, "")}`,
    language: "ja",
    updated: options.updated ?? getStableFeedUpdated(entries, dateStr),
    generator: "hinichi",
    feedLinks,
  });

  for (const entry of entries) {
    feed.addItem({
      title: entry.title,
      id: entry.url,
      link: entry.url,
      description: entry.description,
      content: buildContentEncoded(entry),
      date: parseEntryDate(entry.date, dateStr),
      category: entry.tags.map((tag) => ({ name: tag })),
      image: entry.imageUrl,
    });
  }

  return feed;
}

export function getStableFeedUpdated(entries: HatenaEntry[], fallbackDateStr: string): Date {
  const latestEntryDate = entries
    .map((entry) => parseEntryDate(entry.date, fallbackDateStr))
    .reduce<Date | null>((latest, current) => {
      if (!latest || current.getTime() > latest.getTime()) return current;
      return latest;
    }, null);

  return latestEntryDate ?? getStableSummaryDate(fallbackDateStr);
}

export function getStableSummaryDate(dateStr: string): Date {
  const normalized = normalizeDateString(dateStr);
  return new Date(`${normalized}T23:59:59+09:00`);
}

function buildContentEncoded(entry: HatenaEntry): string {
  const esc = escapeHtml;
  const faviconUrl = `https://cdn-ak2.favicon.st-hatena.com/64?url=${encodeURIComponent(entry.url)}`;
  const bookmarkPageUrl = buildBookmarkCommentUrl(entry.url);
  const bookmarkBadgeUrl = `https://b.hatena.ne.jp/entry/image/${entry.url}`;
  const thumbnailHtml = entry.imageUrl
    ? `<a href="${esc(entry.url)}"><img src="${esc(entry.imageUrl)}" alt="${esc(entry.title)}" title="${esc(entry.title)}" class="entry-image" /></a>`
    : "";

  return [
    `<blockquote cite="${esc(entry.url)}" title="${esc(entry.title)}">`,
    `<cite><img src="${esc(faviconUrl)}" alt="" /> <a href="${esc(entry.url)}">${esc(entry.title)}</a></cite>`,
    thumbnailHtml ? `<p>${thumbnailHtml}</p>` : "",
    entry.description ? `<p>${esc(entry.description)}</p>` : "",
    `<p>`,
    `<a href="${esc(bookmarkPageUrl)}"><img src="${esc(bookmarkBadgeUrl)}" alt="はてなブックマーク - ${esc(entry.title)}" title="はてなブックマーク - ${esc(entry.title)}" border="0" style="border: none" /></a>`,
    ` <a href="${esc(bookmarkPageUrl)}"><img src="https://b.st-hatena.com/images/append.gif" border="0" alt="はてなブックマークに追加" title="はてなブックマークに追加" /></a>`,
    `</p>`,
    `</blockquote>`,
  ].join("");
}

function buildBookmarkCommentUrl(url: string): string {
  try {
    const u = new URL(url);
    const path =
      u.protocol === "https:"
        ? `/entry/s/${u.host}${u.pathname}${u.search}`
        : `/entry/${u.host}${u.pathname}${u.search}`;
    return `https://b.hatena.ne.jp${path}`;
  } catch {
    return `https://b.hatena.ne.jp/entry/${url}`;
  }
}

function parseEntryDate(dateField: string, fallbackDateStr: string): Date {
  // dateField: "2026/02/10 01:17"
  const match = dateField.match(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    // JST (UTC+9) で解釈
    const jstDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00+09:00`);
    if (!isNaN(jstDate.getTime())) return jstDate;
  }
  // フォールバック: dateStr (YYYY-MM-DD or YYYYMMDD) を使う
  const normalized = normalizeDateString(fallbackDateStr);
  return new Date(`${normalized}T00:00:00+09:00`);
}

function normalizeDateString(dateStr: string): string {
  return dateStr.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
