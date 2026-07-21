# OpenGEO — Blinde Vlekken Analyse vs Commerciële AI SEO Tools

## Samenvatting

OpenGEO dekt nu 49 regels. Commerciële tools (Ahrefs, Semrush, Screaming Frog, Sitebulb) en Google's eigen AI Optimization Guide identificeren ~30 extra dimensies die OpenGEO nog niet dekt.

---

## 🔴 KRITIEK — Directe impact op AI ranking (niet in OpenGEO)

### 1. **Backlink Profile & Domain Authority**
**Waarom belangrijk:** Google en AI systemen gebruiken backlinks als primair autoriteits signaal. Zonder kwalitatieve backlinks sta je onder in AI citatie.
**Commercieel:** Ahrefs (Domain Rating), Semrush (Authority Score), Moz (Domain Authority)
**Wat mist:**
- Backlink count & kwaliteit
- Referring domains
- Anchor text distributie
- Toxic backlinks detectie
- Competitor backlink gap

### 2. **Keyword Research & SERP Data**
**Waarom belangrijk:** AI systemen antwoorden op zoekintenties. Als je niet weet waar mensen naar vragen, kun je niet optimaliseren.
**Commercieel:** Ahrefs, Semrush, SE Ranking
**Wat mist:**
- Zoekvolume per keyword
- Keyword moeilijkheidsgraad
- SERP features (featured snippets, PAI, etc.)
- Competitor keyword gaps
- Zoekintentie classificatie

### 3. **Google Search Console Integratie**
**Waarom belangrijk:** Echte performance data — klikfrequenties, imposities, gemiddelde positie.
**Commercieel:** GSC direct, Ahrefs, Semrush
**Wat mist:**
- Daadwerkelijke zoekimposities
- Click-through rates
- Impressies vs clicks
- Query performance

### 4. **AI Citation Tracking**
**Waarom belangrijk:** Meet of je daadwerkelijk geciteerd wordt door AI systemen.
**Commercieel:** Semrush AI Visibility Index, Ahrefs AI Search Monitoring
**Wat mist:**
- Brand mentions in AI antwoorden
- Share of Voice in AI resultaten
- Citation sentiment (positief/negatief)
- Competitor AI visibility

### 5. **Content Gap Analysis vs Competitors**
**Waarom belangrijk:** Als concurrenten onderwerpen dekken die jij niet dekt, verlies je AI zichtbaarheid.
**Commercieel:** Ahrefs Content Gap, Semrush Keyword Gap
**Wat mist:**
- Competitor content mapping
- Ontbrekende topics/keywords
- Content die jij wel hebt maar beter kan

---

## 🟠 BELANGRIJK — Significant voor AI vindbaarheid (deels in OpenGEO)

### 6. **Content Structuur & Semantische Diepte**
**Waarom belangrijk:** AI systemen beoordelen of content een onderwerp volledig dekt (topic coverage).
**Commercieel:** Clearscope, MarketMuse, SurferSEO
**Wat mist:**
- Topic cluster completeness
- Semantische keyword dekking
- Content diepte score
- Subtopic identificatie
- H1-H6 hierarchie kwaliteit

### 7. **E-E-A-T Signalen (Volledig)**
**Waarom belangrijk:** Google's rater guidelines en AI systemen wegen Experience, Expertise, Authoritativeness, Trust.
**Commercieel:** Ahrefs, Semrush, manual audit
**Wat mist:**
- Author expertise signals (bio, credentials, sameAs)
- Trust signals (reviews, certifications, awards)
- Experience signals (first-hand content, original research)
- About page kwaliteit
- Contact page compleetheid
- Privacy/terms pages

### 8. **Page Experience Signals**
**Waarom belangrijk:** Google's Page Experience update is een directe ranking factor.
**Commercieel:** Lighthouse, PageSpeed Insights, Core Web Vitals
**Wat mist:**
- Echte Core Web Vitals metingen (geen simulatie)
- INP (Interaction to Next Paint) — nieuwste vitals
- CLS Cumulative Layout Shift metingen
- LCP Largest Contentful Paint
- TTFB Time to First Byte
- Mobile usability (tap targets, font sizes, viewport)

### 9. **Structured Data Volledigheid**
**Waarom belangrijk:** Meer structured data types = meer kans op Rich Results = meer zichtbaarheid.
**Commercieel:** Schema.org validator, Google Rich Results Test
**Wat mist:**
- Article schema (headline, datePublished, dateModified, author, publisher)
- Person schema (name, jobTitle, sameAs, image)
- Product schema (offers, aggregateRating, review)
- Service schema (provider, areaServed, hasOfferCatalog)
- Review/Rating schema (itemReviewed, ratingValue, author)
- FAQ schema (mainEntity: Question + Answer)
- HowTo schema (step, tool, supply)
- BreadcrumbList (itemListElement)
- Speakable schema

### 10. **Site Architectuur & Information Architecture**
**Waarom belangrijk:** AI crawlers volgen links — slechte architectuur = ontdekkelijkheidsproblemen.
**Commercieel:** Screaming Frog, Sitebulb
**Wat mist:**
- Click depth per pagina (afstand tot homepage)
- PageRank flow / link equity distributie
- Topic cluster / silo structuur
- Hub & spoke model
- Orphan pages (al gedeeltelijk gedekt)
- Dead-end pages
- Internal link anchor text optimalisatie

---

## 🟡 NICE-TO-HAVE — Maar differentiërend

### 11. **JavaScript Rendering vs Static**
**Waarom belangrijk:** SPAs vereisten JS rendering voor echte content.
**Commercieel:** Screaming Frog (rendered crawl), Sitebulb
**Wat mist:**
- Rendered vs non-rendered content vergelijking
- Hydration tijd
- Client-side vs server-side content
- JavaScript framework detectie (React, Vue, Angular)

### 12. **Log File Analysis**
**Waarom belangrijk:** Laat zien hoe Googlebot je site daadwerkelijk crawlt.
**Commercieel:** Screaming Frog Log File Analyser, SEMrush
**Wat mist:**
- Crawl budget optimalisatie
- Crawl frequency per pagina
- Response codes over tijd
- Bot behavior analysis

### 13. **Historical Data & Trending**
**Waarom belangrijk:** Trending laten zien of je verbeterd of verslechtert.
**Commercieel:** Ahrefs, Semrush, GSC
**Wat mist:**
- Ranking history
- Traffic history
- Issue resolution tracking
- Before/after vergelijkingen

### 14. **International SEO (Volledig)**
**Waarom belangrijk:** AI systemen serveren regio-specifieke resultaten.
**Commercieel:** hreflang generator, Semrush
**Wat mist:**
- hreflang implementatie (al deels gedekt)
- Language detection
- Regio-specifieke content
- CDN/geolocation setup

### 15. **Accessibility (Volledig)**
**Waarom belangrijk:** Toegankelijkheid is een ranking signal en verhoogt AI toegankelijkheid.
**Commercieel:** axe, WAVE, Lighthouse
**Wat mist:**
- WCAG 2.1 AA compliance
- Color contrast
- ARIA labels
- Keyboard navigation
- Screen reader compatibility
- Focus indicators

---

## Prioritisatie voor OpenGEO

### Fase 1: Kritiek (direct bouwen)
1. Content structuur & semantische diepte (topic coverage)
2. E-E-A-T signalen uitbreiden (author credentials, trust signals)
3. Structured data volledigheid (Article, Person, Product, Review, FAQ, HowTo)
4. Site architectuur (click depth, PageRank flow, anchor text)
5. Page Experience (echte CWV metingen via Lighthouse API)

### Fase 2: Belangrijk (volgende iteratie)
6. JavaScript rendering vergelijking
7. International SEO volledigheid
8. Accessibility volledigheid
9. Content freshness scoring
10. Meta title/desc optimalisatie (length + keyword)

### Fase 3: Nice-to-have (toekomst)
11. Backlink integratie (via API)
12. GSC integratie
13. AI citation tracking
14. Competitor analysis
15. Log file analysis
