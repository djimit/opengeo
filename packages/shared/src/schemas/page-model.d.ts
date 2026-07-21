import { z } from "zod";
export declare const HttpHeaderSchema: z.ZodObject<{
    name: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    value: string;
}, {
    name: string;
    value: string;
}>;
export type HttpHeader = z.infer<typeof HttpHeaderSchema>;
export declare const LinkSchema: z.ZodObject<{
    href: z.ZodString;
    rel: z.ZodOptional<z.ZodString>;
    text: z.ZodOptional<z.ZodString>;
    is_internal: z.ZodBoolean;
    nofollow: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    href: string;
    nofollow: boolean;
    is_internal: boolean;
    rel?: string | undefined;
    text?: string | undefined;
}, {
    href: string;
    nofollow: boolean;
    is_internal: boolean;
    rel?: string | undefined;
    text?: string | undefined;
}>;
export type Link = z.infer<typeof LinkSchema>;
export declare const MetaTagSchema: z.ZodObject<{
    name: z.ZodString;
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
    name: string;
}, {
    content: string;
    name: string;
}>;
export type MetaTag = z.infer<typeof MetaTagSchema>;
export declare const HeadingSchema: z.ZodObject<{
    level: z.ZodNumber;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    text: string;
    level: number;
}, {
    text: string;
    level: number;
}>;
export type Heading = z.infer<typeof HeadingSchema>;
export declare const JsonLdSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodString>;
    raw: z.ZodString;
    parsed: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    raw: string;
    type?: string | undefined;
    parsed?: Record<string, unknown> | undefined;
}, {
    raw: string;
    type?: string | undefined;
    parsed?: Record<string, unknown> | undefined;
}>;
export type JsonLd = z.infer<typeof JsonLdSchema>;
export declare const NormalizedPageModelSchema: z.ZodObject<{
    url: z.ZodString;
    final_url: z.ZodString;
    status_code: z.ZodNumber;
    content_type: z.ZodString;
    title: z.ZodString;
    meta_description: z.ZodOptional<z.ZodString>;
    canonical: z.ZodOptional<z.ZodString>;
    robots_directives: z.ZodArray<z.ZodString, "many">;
    noindex: z.ZodBoolean;
    nofollow: z.ZodBoolean;
    headers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        value: string;
    }, {
        name: string;
        value: string;
    }>, "many">;
    meta_tags: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        content: string;
        name: string;
    }, {
        content: string;
        name: string;
    }>, "many">;
    headings: z.ZodArray<z.ZodObject<{
        level: z.ZodNumber;
        text: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        text: string;
        level: number;
    }, {
        text: string;
        level: number;
    }>, "many">;
    links: z.ZodArray<z.ZodObject<{
        href: z.ZodString;
        rel: z.ZodOptional<z.ZodString>;
        text: z.ZodOptional<z.ZodString>;
        is_internal: z.ZodBoolean;
        nofollow: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        href: string;
        nofollow: boolean;
        is_internal: boolean;
        rel?: string | undefined;
        text?: string | undefined;
    }, {
        href: string;
        nofollow: boolean;
        is_internal: boolean;
        rel?: string | undefined;
        text?: string | undefined;
    }>, "many">;
    jsonld: z.ZodArray<z.ZodObject<{
        type: z.ZodOptional<z.ZodString>;
        raw: z.ZodString;
        parsed: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        raw: string;
        type?: string | undefined;
        parsed?: Record<string, unknown> | undefined;
    }, {
        raw: string;
        type?: string | undefined;
        parsed?: Record<string, unknown> | undefined;
    }>, "many">;
    html_length: z.ZodNumber;
    text_content: z.ZodString;
    word_count: z.ZodNumber;
    crawled_at: z.ZodString;
    render_method: z.ZodEnum<["static", "javascript"]>;
}, "strip", z.ZodTypeAny, {
    url: string;
    title: string;
    noindex: boolean;
    nofollow: boolean;
    final_url: string;
    status_code: number;
    content_type: string;
    robots_directives: string[];
    headers: {
        name: string;
        value: string;
    }[];
    meta_tags: {
        content: string;
        name: string;
    }[];
    headings: {
        text: string;
        level: number;
    }[];
    links: {
        href: string;
        nofollow: boolean;
        is_internal: boolean;
        rel?: string | undefined;
        text?: string | undefined;
    }[];
    jsonld: {
        raw: string;
        type?: string | undefined;
        parsed?: Record<string, unknown> | undefined;
    }[];
    html_length: number;
    text_content: string;
    word_count: number;
    crawled_at: string;
    render_method: "static" | "javascript";
    meta_description?: string | undefined;
    canonical?: string | undefined;
}, {
    url: string;
    title: string;
    noindex: boolean;
    nofollow: boolean;
    final_url: string;
    status_code: number;
    content_type: string;
    robots_directives: string[];
    headers: {
        name: string;
        value: string;
    }[];
    meta_tags: {
        content: string;
        name: string;
    }[];
    headings: {
        text: string;
        level: number;
    }[];
    links: {
        href: string;
        nofollow: boolean;
        is_internal: boolean;
        rel?: string | undefined;
        text?: string | undefined;
    }[];
    jsonld: {
        raw: string;
        type?: string | undefined;
        parsed?: Record<string, unknown> | undefined;
    }[];
    html_length: number;
    text_content: string;
    word_count: number;
    crawled_at: string;
    render_method: "static" | "javascript";
    meta_description?: string | undefined;
    canonical?: string | undefined;
}>;
export type NormalizedPageModel = z.infer<typeof NormalizedPageModelSchema>;
