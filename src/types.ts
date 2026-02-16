export interface HatenaEntry {
  title: string;
  url: string;
  description: string;
  users: number;
  domain: string;
  category: string;
  date: string;
  tags: string[];
  imageUrl?: string;
}

export const CATEGORIES = [
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
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  all: "総合",
  general: "一般",
  social: "世の中",
  economics: "政治と経済",
  life: "暮らし",
  knowledge: "学び",
  it: "テクノロジー",
  fun: "おもしろ",
  entertainment: "エンタメ",
  game: "アニメとゲーム",
};

export type OutputFormat = "rss" | "atom" | "json" | "html";

export interface Env {
  GOOGLE_AI_API_KEY: string;
  BROWSER_RENDERING_ACCOUNT_ID: string;
  BROWSER_RENDERING_API_TOKEN: string;
  CACHE_KV?: KVNamespace;
}

export interface ArticleSummary {
  title: string;
  url: string;
  summary: string;
}

export interface AISummaryResult {
  overview: string;
  articles: ArticleSummary[];
}
