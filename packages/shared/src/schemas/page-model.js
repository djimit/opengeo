import { z } from "zod";
export const HttpHeaderSchema = z.object({
    name: z.string(),
    value: z.string(),
});
export const LinkSchema = z.object({
    href: z.string(),
    rel: z.string().optional(),
    text: z.string().optional(),
    is_internal: z.boolean(),
    nofollow: z.boolean(),
});
export const MetaTagSchema = z.object({
    name: z.string(),
    content: z.string(),
});
export const HeadingSchema = z.object({
    level: z.number().int().min(1).max(6),
    text: z.string(),
});
export const JsonLdSchema = z.object({
    type: z.string().optional(),
    raw: z.string(),
    parsed: z.record(z.unknown()).optional(),
});
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
});
//# sourceMappingURL=page-model.js.map