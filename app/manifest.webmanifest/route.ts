import { getPlatformIdentity } from "../../db/platform-settings";
import { platformIconUrl, platformOrigin, platformSeoDescription } from "../../db/public-seo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const platform = await getPlatformIdentity();
  const origin = platformOrigin({ get: name => request.headers.get(name) }, platform);
  const icon = platformIconUrl(origin, platform) || `${origin}/favicon.svg`;

  return Response.json({
    name: platform.platformName,
    short_name: platform.shortName,
    description: platformSeoDescription(platform),
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7fbf7",
    theme_color: platform.primaryColor,
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, {
    headers: {
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
      "content-type": "application/manifest+json; charset=utf-8",
    },
  });
}
