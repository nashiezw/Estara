import { NextRequest, NextResponse } from "next/server";

const RESERVED = ["/api", "/_next", "/favicon", "/robots.txt", "/sitemap.xml", "/manifest", "/assets"];

function normalizeHost(value: string) {
  return value.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function tenantSlugFromPublicHost(host: string) {
  const suffix = normalizeHost(process.env.PUBLIC_SITE_DOMAIN || "sites.estara.co.zw").replace(/^\*\./, "");
  const domain = normalizeHost(host);
  if (!suffix || domain === suffix || !domain.endsWith(`.${suffix}`)) return "";
  const slug = domain.slice(0, -suffix.length - 1);
  return /^[a-z][a-z0-9-]{3,58}[a-z0-9]$/.test(slug) && !slug.includes("--") && !slug.includes(".") ? slug : "";
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const slug = tenantSlugFromPublicHost(host);
  if (!slug) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (RESERVED.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return NextResponse.next();

  const legacyPrefix = `/site/${slug}`;
  if (pathname === legacyPrefix || pathname.startsWith(`${legacyPrefix}/`)) {
    const cleanPath = pathname.slice(legacyPrefix.length) || "/";
    const url = request.nextUrl.clone();
    url.pathname = cleanPath;
    url.search = search;
    return NextResponse.redirect(url, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/site/${slug}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

