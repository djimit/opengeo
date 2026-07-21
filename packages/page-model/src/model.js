export function emptyPage(url) {
    return {
        url,
        final_url: url,
        status_code: 0,
        content_type: "",
        title: "",
        robots_directives: [],
        noindex: false,
        nofollow: false,
        headers: [],
        meta_tags: [],
        headings: [],
        links: [],
        jsonld: [],
        html_length: 0,
        text_content: "",
        word_count: 0,
        crawled_at: new Date().toISOString(),
        render_method: "static",
    };
}
export function hasNoindex(page) {
    if (page.noindex)
        return true;
    return page.robots_directives.some((d) => d.toLowerCase() === "noindex" || d.toLowerCase() === "none");
}
export function hasNofollow(page) {
    if (page.nofollow)
        return true;
    return page.robots_directives.some((d) => d.toLowerCase() === "nofollow");
}
export function getHeadingsText(page) {
    return page.headings.map((h) => h.text);
}
export function getInternalLinks(page) {
    return page.links.filter((l) => l.is_internal);
}
export function getExternalLinks(page) {
    return page.links.filter((l) => !l.is_internal);
}
export function getJsonLdTypes(page) {
    return page.jsonld.map((j) => j.type).filter((t) => !!t);
}
export function hasJsonLdType(page, type) {
    return page.jsonld.some((j) => j.type === type);
}
export function getMetaContent(page, name) {
    const tag = page.meta_tags.find((m) => m.name.toLowerCase() === name.toLowerCase());
    return tag?.content;
}
export function getHeaderValue(page, name) {
    const header = page.headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value;
}
export function isOrphanPage(page, allPages) {
    if (page.url === page.final_url && allPages[0]?.url === page.url)
        return false;
    return !allPages.some((p) => p.links.some((l) => l.href === page.url && l.is_internal));
}
//# sourceMappingURL=model.js.map