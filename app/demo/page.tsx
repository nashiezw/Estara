import { headers } from "next/headers";
import { getPlatformIdentity } from "../../db/platform-settings";
import DemoExperience from "./demo-client";
import "./demo.css";

export const dynamic = "force-dynamic";

function normalizeHost(host: string) {
  return host.toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

function platformDomainFromHost(host: string, configuredDomain: string) {
  const configured = normalizeHost(configuredDomain);
  if (configured) return configured;
  const domain = normalizeHost(host);
  if (!domain || domain === "localhost" || domain === "127.0.0.1" || domain === "::1") return "";
  if (domain.endsWith(".workers.dev") || domain.endsWith(".pages.dev")) return "";
  if (domain.startsWith("www.")) return domain.slice(4);
  if (domain.startsWith("app.")) return domain.slice(4);
  return domain;
}

function appHref(path: string, platformDomain: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const domain = normalizeHost(platformDomain);
  return domain ? `https://app.${domain}${cleanPath}` : cleanPath;
}

export default async function DemoPage() {
  const platform = await getPlatformIdentity();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const publicDomain = platformDomainFromHost(host, platform.domain);
  const loginHref = appHref("/login", publicDomain);
  const registerHref = appHref("/register", publicDomain);
  return <DemoExperience platform={platform} loginHref={loginHref} registerHref={registerHref} />;
}
