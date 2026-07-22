# OpenGEO — Open Generative Engine Optimization

> **Evidence-backed AI Search Readiness Auditor**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green)](LICENSE)
[![SARIF](https://img.shields.io/badge/SARIF-2.1.0-orange)](https://sarifweb.azurewebsites.net/)

OpenGEO is an open-source CLI, GitHub Action, and web dashboard that analyzes websites for **discoverability**, **interpretability**, and **citability** by AI search engines, traditional search engines, and retrieval systems.

**No rankings sold. No magic scores. Only evidence-backed findings with concrete patches.**

<img width="1536" height="1024" alt="OpenGEO" src="https://github.com/user-attachments/assets/1c6cda9f-4934-46f6-a923-ed5120160a3a" />


---

## Quick Start

```bash
# Run an audit
npx @opengeo/cli audit https://example.org

# With full options
npx @opengeo/cli audit https://example.org \
  --max-pages 500 \
  --depth 3 \
  --render static \
  --policy balanced \
  --format markdown \
  --locale nl \
  --output report.md

# Start the dashboard
npx @opengeo/cli serve --port 3000
```

Or use Docker:

```bash
docker run --rm ghcr.io/DjimIT/opengeo \
  audit https://example.org \
  --depth 3 \
  --output ./opengeo-report
```

---

## Features

### 35+ Evidence-Backed Rules

Every finding includes: rule ID, severity, confidence, evidence (URL + snippet), impact assessment (search / AI retrieval / model training / UX), recommendation with effort estimate, sources with vendor + type, and rule metadata (status, evidence level, last reviewed, maintainer).

| Category | Rules | What We Check |
|----------|-------|---------------|
| **Crawlability** | GEO-CRAWl-001 through 010 | robots.txt, sitemaps, canonicals, redirects, noindex, status codes, duplicate content, orphan pages, hreflang |
| **Structured Data** | GEO-DATA-001 through 005 | JSON-LD detection, Schema.org validity, Organization/Breadcrumb/WebSite schema, parse errors |
| **Content** | GEO-CONTENT-001 through 003 | Thin content, author attribution, FAQ/HowTo markup |
| **Citations** | GEO-CITE-001 through 002 | Publication dates, source attribution for claims |
| **Entities** | GEO-ENTITY-001 through 004 | Title, meta description, H1, organization consistency |
| **Security** | GEO-SEC-001 through 002 | Security headers, HTTPS |
| **Performance** | GEO-PERF-001 through 004 | Page size, large DOM, slow render, JS errors |
| **Web Vitals** | GEO-WEBVITAL-001 through 003 | LCP, INP, CLS (via Performance Observer) |
| **Governance** | GEO-GOV-001 through 002 | llms.txt, privacy policy |

### JavaScript Rendering (SPA Support)

Full Playwright-based rendering for Single Page Applications:
- React, Vue, Angular framework detection
- Hydration detection (content changes after initial render)
- Scroll-triggered lazy loading
- JavaScript error capture
- Resource counting

### Rate Limiting & Politeness

- Adaptive backoff on errors (exponential)
- Respects `Crawl-delay` from robots.txt
- Configurable concurrency per domain
- Max requests per second enforcement
- Automatic delay reduction on success

### Sitemap Discovery

- robots.txt sitemap extraction
- Sitemap index parsing (nested sitemaps)
- Priority/lastmod extraction
- URL filtering (exclude patterns, min priority)

### Core Web Vitals

- **LCP** (Largest Contentful Paint): target <2.5s
- **INP** (Interaction to Next Paint): target <200ms
- **CLS** (Cumulative Layout Shift): target <0.1
- **TTFB** (Time to First Byte): target <800ms
- **FCP** (First Contentful Paint)

### Hreflang Detection

- Link tag parsing
- x-default fallback detection
- International SEO consistency

### SARIF Export

Native SARIF 2.1.0 output for GitHub Code Scanning integration. Findings appear as code scanning alerts in PRs.

### Patch Generator

Unified-diff patches for common issues:
- Missing canonical URL
- Missing Organization schema
- Missing meta description
- Missing H1 heading
- Missing security headers

### SQLite Persistence

- Audit history with trending
- Before/after comparison
- Finding resolution tracking
- Per-URL trend data

### Dashboard

Web interface at `http://localhost:3000`:
- **Executive Dashboard**: report overview, stats, history
- **Crawl Explorer**: per-finding detail view, filters, impact matrix
- **Entity Graph**: interactive force-directed knowledge graph
- **Trends**: findings over time, before/after comparison

### LLM Provider (BYO-API)

Four levels of AI assistance:

| Level | Description | Data Leaves Machine |
|-------|-------------|-------------------|
| 0 | Deterministic rules only | Never |
| 1 | Local embedding model (Ollama) | Never |
| 2 | Local LLM (Ollama) | Never |
| 3 | External API (OpenAI, Anthropic) | Yes — explicit opt-in |

### Multi-Language Output

Reports in English (en), Dutch (nl), German (de), and French (fr):

```bash
opengeo audit https://example.org --locale nl  # Nederlands
opengeo audit https://example.org --locale de  # Deutsch
opengeo audit https://example.org --locale fr  # Français
```

### GitHub Action

```yaml
name: OpenGEO Audit
on:
  pull_request:
  schedule:
    - cron: "0 5 * * 1"

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          url: https://example.org
          fail_on: critical
          format: sarif
          output: opengeo.sarif
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: opengeo.sarif
```

---

## Architecture

```
CLI / GitHub Action / Dashboard
         ↓
   @opengeo/core (orchestration)
         ↓
   Crawler → Renderer → Page Model → Rule Engine
         ↓                              ↓
   Sitemap Parser              Evidence + Findings
   Rate Limiter                       ↓
   Playwright                 Reports (MD/JSON/SARIF)
   Lighthouse                 Patch Generator
                              SQLite Store
```

---

## CLI Reference

```
opengeo audit <url> [options]

Options:
  -m, --max-pages <number>    Maximum pages to crawl (default: 100)
  -d, --depth <number>        Crawl depth (default: 3)
  -r, --render <mode>         Render mode: static or javascript (default: static)
  -p, --policy <policy>       Crawler policy: strict, balanced, permissive (default: balanced)
  -o, --output <path>         Output file path (default: stdout)
  -f, --format <format>       Output format: markdown, json, sarif (default: markdown)
  --locale <locale>           Output locale: en, nl, de, fr (default: en)
  --llm-level <level>         LLM level: 0-3 (default: 0)
  --ollama-url <url>          Ollama server URL
  --ollama-model <model>      Ollama model name
  --api-key <key>             External API key (Level 3)
  --api-base-url <url>        External API base URL
  --api-model <model>         External API model
  --sync-djimitflo <taskId>   Sync findings to Djimitflo
  --djimitflo-url <url>       Djimitflo server URL
  --djimitflo-token <token>   Djimitflo auth token
  -h, --help                  Display help

opengeo serve [options]

Options:
  -p, --port <number>        Port to serve on (default: 3000)
  -h, --help                  Display help
```

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENGEO_LOCALE` | Default output locale | `en` |
| `OPENGEO_LLM_LEVEL` | Default LLM level | `0` |
| `OPENGEO_OLLAMA_URL` | Ollama server URL | `http://localhost:11434` |
| `OPENGEO_API_KEY` | External API key | — |
| `OPENGEO_API_BASE_URL` | External API base URL | `https://api.openai.com/v1` |

---

## Governance

### Rule Lifecycle

```
draft → experimental → verified → deprecated → archived
```

### Rule RFC Process

1. New rules proposed via RFC in `rules/rfc/`
2. Community review period: 14 days
3. Maintainer merges or requests changes
4. Rule enters `experimental`, then `verified` after corpus validation

### Anti-Marketing Manifest

OpenGEO **never** promises:

- Guaranteed ranking in any search engine or AI system
- Guaranteed inclusion in LLM training data
- Secret "GPT-tags" or "AI visibility scores"
- Magical llms.txt scores
- Automatic backlinks or synthetic reviews
- Content spinning or doorway pages
- Hidden text or schema stuffing
- Unproven correlations as ranking factors
- Vendor advice without official source or reproducible test

**We expose what AI-search agencies sell, separate evidence from speculation, and generate the fixes transparently.**

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, rule templates, and testing guidelines.

---

## License

- **Software:** [Apache-2.0](LICENSE)
- **Methodology & Documentation:** CC BY 4.0

---

*Part of the [DjimIT](https://github.com/DjimIT) open-source ecosystem.*
