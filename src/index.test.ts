import { SELF, fetchMock } from "cloudflare:test";
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import app from "./index";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

afterEach(() => {
  fetchMock.assertNoPendingInterceptors();
});

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>はてなブックマーク - 人気エントリー - テクノロジー - 2026年2月10日</title>
</head>
<body>
<div class="entrylist-wrapper">
  <div class="entrylist-contents-main">
    <h3 class="entrylist-contents-title">
      <a href="https://example.com/article1">テスト記事タイトル1</a>
    </h3>
    <span class="entrylist-contents-users"><a><span>123 users</span></a></span>
    <span class="entrylist-contents-domain"><a><span>example.com</span></a></span>
    <div class="entrylist-contents-description"><p>これはテスト記事の説明文です。</p></div>
    <span class="entrylist-contents-date">テクノロジー 2026/02/10 14:30</span>
    <div class="entrylist-contents-tags">
      <a>AI</a>
      <a>プログラミング</a>
    </div>
  </div>
  <div class="entrylist-contents-main">
    <h3 class="entrylist-contents-title">
      <a href="https://example.com/article2">テスト記事タイトル2</a>
    </h3>
    <span class="entrylist-contents-users"><a><span>456 users</span></a></span>
    <span class="entrylist-contents-domain"><a><span>example.org</span></a></span>
    <div class="entrylist-contents-description"><p>2つ目のテスト記事です。</p></div>
    <span class="entrylist-contents-date">テクノロジー 2026/02/10 09:00</span>
    <div class="entrylist-contents-tags">
      <a>Rust</a>
    </div>
  </div>
</div>
</body>
</html>`;

describe("GET /:category", () => {
  it("returns 400 for invalid category", async () => {
    const res = await SELF.fetch("http://localhost/invalid");
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid format", async () => {
    const res = await SELF.fetch("http://localhost/it?format=xml&date=20260210");
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid date format", async () => {
    const res = await SELF.fetch("http://localhost/it?date=2026-02-10");
    expect(res.status).toBe(400);
  });

  it("returns descriptive error for summary request when AI bindings are missing", async () => {
    const res = await app.request(
      "http://localhost/it?format=json&summary=ai&date=20260210",
      undefined,
      {
        GOOGLE_AI_API_KEY: "",
        BROWSER_RENDERING_ACCOUNT_ID: "",
        BROWSER_RENDERING_API_TOKEN: "",
      },
    );
    expect(res.status).toBe(500);

    const body = (await res.json()) as {
      error: string;
      details?: string[];
    };
    expect(body.error).toBe("AI要約の設定が不足しています");
    expect(body.details?.join("\n")).toContain("GOOGLE_AI_API_KEY");
    expect(body.details?.join("\n")).toContain("BROWSER_RENDERING_ACCOUNT_ID");
    expect(body.details?.join("\n")).toContain("BROWSER_RENDERING_API_TOKEN");
  });

  it("returns RSS feed with extracted entries", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const res = await SELF.fetch("http://localhost/it?format=rss&date=20260210");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/rss+xml");

    const body = await res.text();
    expect(body).toContain("<rss");
    expect(body).toContain("テスト記事タイトル1");
    expect(body).toContain("テスト記事タイトル2");
    expect(body).toContain("blockquote");
    expect(body).toContain("https://example.com/article1");
    expect(body).toContain("b.hatena.ne.jp/entry/s/example.com/article1");
  });

  it("returns Atom feed", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const res = await SELF.fetch("http://localhost/it?format=atom&date=20260210");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/atom+xml");

    const body = await res.text();
    expect(body).toContain("<feed");
    expect(body).toContain("テスト記事タイトル1");
  });

  it("returns JSON Feed", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const res = await SELF.fetch("http://localhost/it?format=json&date=20260210");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/feed+json");

    const json = (await res.json()) as { title: string; items: Array<{ title: string }> };
    expect(json.title).toContain("テクノロジー");
    expect(json.items.length).toBe(2);
    expect(json.items[0].title).toContain("テスト記事タイトル1");
  });

  it("returns HTML page", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const res = await SELF.fetch("http://localhost/it?format=html&date=20260210");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");

    const body = await res.text();
    expect(body).toContain("テスト記事タイトル1");
    expect(body).toContain("123 users");
    expect(body).toContain("example.com");
    expect(body).toContain('href="https://b.hatena.ne.jp/hotentry/it/20260210"');
  });

  it("returns 502 when hatena returns error", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(500, "Internal Server Error");

    const res = await SELF.fetch("http://localhost/it?format=rss&date=20260210");
    expect(res.status).toBe(502);
  });

  it("extracts tags correctly", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const res = await SELF.fetch("http://localhost/it?format=json&date=20260210");
    const json = (await res.json()) as {
      items: Array<{ tags: string[] }>;
    };
    expect(json.items[0].tags).toContain("AI");
    expect(json.items[0].tags).toContain("プログラミング");
    expect(json.items[1].tags).toContain("Rust");
  });

  it("supports all valid categories", async () => {
    const categories = [
      "all",
      "general",
      "social",
      "economics",
      "life",
      "knowledge",
      "it",
      "fun",
      "entertainment",
      "game",
    ];

    for (const cat of categories) {
      fetchMock
        .get("https://b.hatena.ne.jp")
        .intercept({ path: `/hotentry/${cat}/20260210` })
        .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

      const res = await SELF.fetch(`http://localhost/${cat}?format=json&date=20260210`);
      expect(res.status).toBe(200);
    }
  });

  it("accepts revalidate parameter", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const res = await SELF.fetch("http://localhost/it?format=rss&date=20260210&revalidate=true");
    expect(res.status).toBe(200);
  });

  it("reuses cached entry payload across formats for the same date", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const rss = await SELF.fetch("http://localhost/it?format=rss&date=20260210");
    expect(rss.status).toBe(200);

    const atom = await SELF.fetch("http://localhost/it?format=atom&date=20260210");
    expect(atom.status).toBe(200);
  });

  it("does not expose cache headers to clients for cached responses", async () => {
    fetchMock
      .get("https://b.hatena.ne.jp")
      .intercept({ path: "/hotentry/it/20260210" })
      .reply(200, SAMPLE_HTML, { headers: { "content-type": "text/html" } });

    const first = await SELF.fetch("http://localhost/it?format=atom&date=20260210");
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBeNull();
    expect(first.headers.get("age")).toBeNull();
    expect(first.headers.get("expires")).toBeNull();
    expect(first.headers.get("last-modified")).toBeNull();
    expect(first.headers.get("etag")).toBeNull();

    const second = await SELF.fetch("http://localhost/it?format=atom&date=20260210");
    expect(second.status).toBe(200);
    expect(second.headers.get("cache-control")).toBeNull();
    expect(second.headers.get("age")).toBeNull();
    expect(second.headers.get("expires")).toBeNull();
    expect(second.headers.get("last-modified")).toBeNull();
    expect(second.headers.get("etag")).toBeNull();
  });

  it("redirects root to /all with default params", async () => {
    const res = await SELF.fetch("http://localhost/", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/all?format=html&summary=ai");
  });
});
