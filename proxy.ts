import { NextRequest, NextResponse } from "next/server";
import { ESTARA_TENANT_DOMAIN_SUFFIX, hostedTenantUrl, legacyTenantSlugFromHost, tenantSlugFromHost } from "./db/domain.ts";

const RESERVED = ["/api", "/_next", "/favicon", "/robots.txt", "/sitemap.xml", "/manifest", "/assets"];

function tenantSlugFromPublicHost(host: string) {
  return tenantSlugFromHost(host, process.env.PUBLIC_SITE_DOMAIN || ESTARA_TENANT_DOMAIN_SUFFIX) || "";
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const legacySlug = legacyTenantSlugFromHost(host);
  if (legacySlug) {
    const target = hostedTenantUrl(legacySlug, ESTARA_TENANT_DOMAIN_SUFFIX, `${request.nextUrl.pathname}${request.nextUrl.search}`);
    if (target) return NextResponse.redirect(target, 308);
  }

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
