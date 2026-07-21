import { z } from "zod"

export const HttpHeaderSchema = z.object({
  name: z.string(),
  value: z.string(),
})
export type HttpHeader = z.infer<typeof HttpHeaderSchema>

export const LinkSchema = z.object({
  href: z.string(),
  rel: z.string().optional(),
  text: z.string().optional(),
  is_internal: z.boolean(),
  nofollow: z.boolean(),
})
export type Link = z.infer<typeof LinkSchema>

export const MetaTagSchema = z.object({
  name: z.string(),
  content: z.string(),
})
export type MetaTag = z.infer<typeof MetaTagSchema>

export const HeadingSchema = z.object({
  level: z.number().int().min(1).max(6),
  text: z.string(),
})
export type Heading = z.infer<typeof HeadingSchema>

export const JsonLdSchema = z.object({
  type: z.string().optional(),
  raw: z.string(),
  parsed: z.record(z.unknown()).optional(),
})
export type JsonLd = z.infer<typeof JsonLdSchema>

export const NormalizedPageModelSchema = z.object({
  url: z.string(),
  final_url: z.string(),
  status_code: z.number().int(),
  content_type: z.string(),
  title: z.string(),
  meta_description: z.string().optional(),
  canonical: z.string().optional(),
  robots_directives: z.array(z.string()),
  noindex: z.boolean(),
  nofollow: z.boolean(),
  headers: z.array(HttpHeaderSchema),
  meta_tags: z.array(MetaTagSchema),
  headings: z.array(HeadingSchema),
  links: z.array(LinkSchema),
  jsonld: z.array(JsonLdSchema),
  html_length: z.number().int(),
  text_content: z.string(),
  word_count: z.number().int(),
  crawled_at: z.string(),
  render_method: z.enum(["static", "javascript"]),
  has_time_element: z.boolean().optional(),
  has_date_in_meta: z.boolean().optional(),
  hydration_detected: z.boolean().optional(),
  render_time_ms: z.number().int().optional(),
  resource_count: z.number().int().optional(),
  js_errors: z.array(z.string()).optional(),
  raw_html: z.string().optional(),
  lighthouse_scores: z.object({
    performance: z.number().min(0).max(1).optional(),
    accessibility: z.number().min(0).max(1).optional(),
    seo: z.number().min(0).max(1).optional(),
    best_practices: z.number().min(0).max(1).optional(),
  }).optional(),
  core_web_vitals: z.object({
    lcp: z.number().optional(),
    inp: z.number().optional(),
    cls: z.number().optional(),
    ttfb: z.number().optional(),
    fcp: z.number().optional(),
  }).optional(),
  hreflang: z.array(z.object({
    lang: z.string(),
    url: z.string(),
  })).optional(),
})
export type NormalizedPageModel = z.infer<typeof NormalizedPageModelSchema>
