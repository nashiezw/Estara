import { getPlatformIdentity } from "../../db/platform-settings";
import { platformOrigin } from "../../db/public-seo";

export const dynamic = "force-dynamic";

const privatePaths = [
  "/admin",
  "/api/",
  "/ask-estara",
  "/audit",
  "/backups",
  "/branches",
  "/contacts",
  "/deals",
  "/developer",
  "/developments",
  "/documents",
  "/domains",
  "/integrations",
  "/management",
  "/marketing-studio",
  "/matching",
  "/pipeline",
  "/properties",
  "/property-compliance",
  "/property-operations",
  "/reports",
  "/roles",
  "/search",
  "/seller",
  "/shortlist",
  "/subscription",
  "/workspace",
];

export async function GET(request: Request) {
  const platform = await getPlatformIdentity();
  const origin = platformOrigin({ get: name => request.headers.get(name) }, platform);
  const body = [
    "User-agent: *",
    "Allow: /$",
    "Allow: /demo",
    "Allow: /site/",
    ...privatePaths.map(path => `Disallow: ${path}`),
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
