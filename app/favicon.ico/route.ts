import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

const cacheHeaders = {
  "cache-control": "public, max-age=300, stale-while-revalidate=86400",
  "x-content-type-options": "nosniff",
};

const fallbackSvg = `<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="64" height="64" rx="16" fill="#fff"/><path d="M32 9 51 20v7L32 16 13 27v-7L32 9Z" fill="#0c273f"/><path d="M32 20 51 31v7L32 27 13 38v-7l19-11Z" fill="#153b34"/><path d="M24 38h16v15H24V38Z" fill="#153b34"/><path d="M28 42h3v3h-3v-3Zm5 0h3v3h-3v-3Zm-5 5h3v3h-3v-3Zm5 0h3v3h-3v-3Z" fill="#fff"/><path d="M32 31 45 39v6L32 37l-13 8v-6l13-8Z" fill="#2f8f7b"/></svg>`;

async function brandIcon() {
  for (const key of ["platform/brand/icon.webp", "platform/brand/dark-icon.webp"]) {
    const object = await env.MEDIA?.get(key);
    if (object) return new Response(object.body, {
      headers: {
        ...cacheHeaders,
        "content-type": object.httpMetadata?.contentType || "image/webp",
      },
    });
  }
  return new Response(fallbackSvg, {
    headers: {
      ...cacheHeaders,
      "content-type": "image/svg+xml; charset=utf-8",
    },
  });
}

export async function GET() {
  return brandIcon();
}
