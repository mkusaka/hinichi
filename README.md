# hinichi

A Cloudflare Workers application that aggregates daily hot entries from Hatena Bookmark and serves them as RSS/Atom/JSON feeds or HTML pages. Includes AI-powered summaries via Google Gemini.

## Features

- Daily hot entry collection from Hatena Bookmark
- RSS / Atom / JSON feed generation
- Newspaper-style HTML view
- AI summaries powered by Google Gemini (trend overview + per-article summaries)
- Category filtering (all, general, social, economics, life, knowledge, it, fun, entertainment, game)
- Date-based archive browsing
- Multi-layer caching (entries, article content, AI summaries)

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Language**: TypeScript
- **Build**: Vite + @cloudflare/vite-plugin
- **AI**: Vercel AI SDK + Google Gemini
- **Testing**: Vitest (@cloudflare/vitest-pool-workers)
- **Lint / Format**: oxlint / oxfmt

## Setup

```bash
pnpm install
```

### Environment Variables

Create `.dev.vars` with the following:

```
GOOGLE_AI_API_KEY=<Google AI API Key>
BROWSER_RENDERING_ACCOUNT_ID=<Cloudflare Account ID>
BROWSER_RENDERING_API_TOKEN=<Cloudflare API Token>
```

## Development

```bash
pnpm dev       # Start dev server
pnpm build     # Build
pnpm preview   # Preview production build
pnpm deploy    # Deploy to Cloudflare Workers
```

## Testing & Quality

```bash
pnpm test          # Run tests
pnpm lint          # Lint
pnpm format:check  # Check formatting
pnpm format        # Apply formatting
```

## API

### `GET /:category`

Fetch entries by category. `/` redirects to `/all?format=html&summary=ai`.

**Categories**: `all`, `general`, `social`, `economics`, `life`, `knowledge`, `it`, `fun`, `entertainment`, `game`

**Query Parameters**:

| Parameter | Values | Description |
|---|---|---|
| `format` | `rss` (default), `atom`, `json`, `html` | Output format |
| `date` | `YYYYMMDD` | Target date (defaults to yesterday in JST) |
| `summary` | `ai`, `aiOnly` | Enable AI summary |
| `revalidate` | `true`, `1` | Force cache refresh |

## License

MIT
