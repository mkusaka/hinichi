import { describe, expect, it } from "vitest";
import { generateFeed, getStableSummaryDate } from "./feed-generator";
import type { HatenaEntry } from "./types";

const sampleEntries: HatenaEntry[] = [
  {
    title: "テスト記事タイトル1",
    url: "https://example.com/article1",
    users: 123,
    domain: "example.com",
    category: "テクノロジー",
    description: "これはテスト記事の説明文です。",
    date: "2026/02/10 14:30",
    tags: ["AI", "プログラミング"],
    imageUrl: "https://example.com/image1.png",
  },
  {
    title: "テスト記事タイトル2",
    url: "https://example.org/article2",
    users: 456,
    domain: "example.org",
    category: "テクノロジー",
    description: "2つ目のテスト記事です。",
    date: "2026/02/10 09:00",
    tags: ["Rust"],
  },
];

describe("feed-generator", () => {
  it("uses the latest entry date as the channel update timestamp", () => {
    const feed = generateFeed(sampleEntries, "it", "2026-02-10", "https://hinichi.example");

    expect(feed.rss2()).toContain("<lastBuildDate>Tue, 10 Feb 2026 05:30:00 GMT</lastBuildDate>");
  });

  it("builds a stable end-of-day JST timestamp for summary items", () => {
    expect(getStableSummaryDate("20260210").toUTCString()).toBe("Tue, 10 Feb 2026 14:59:59 GMT");
    expect(getStableSummaryDate("2026-02-10").toUTCString()).toBe("Tue, 10 Feb 2026 14:59:59 GMT");
  });

  it("preserves feed variant links for dated summary feeds", () => {
    const feed = generateFeed(sampleEntries, "it", "2026-02-10", "https://hinichi.example", {
      feedId: "https://hinichi.example/it?date=20260210&summary=ai",
      feedLinks: {
        rss: "https://hinichi.example/it?format=rss&date=20260210&summary=ai",
        atom: "https://hinichi.example/it?format=atom&date=20260210&summary=ai",
        json: "https://hinichi.example/it?format=json&date=20260210&summary=ai",
      },
      updated: getStableSummaryDate("20260210"),
    });

    expect(feed.rss2()).toContain(
      '<atom:link href="https://hinichi.example/it?format=rss&amp;date=20260210&amp;summary=ai" rel="self" type="application/rss+xml"/>',
    );
    const json = JSON.parse(feed.json1()) as { feed_url: string; id: string };
    expect(json.feed_url).toBe("https://hinichi.example/it?format=json&date=20260210&summary=ai");
    expect(feed.atom1()).toContain(
      "<id>https://hinichi.example/it?date=20260210&amp;summary=ai</id>",
    );
  });
});
