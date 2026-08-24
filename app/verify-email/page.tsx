import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";
import { getPlatformIdentity } from "../../db/platform-settings";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [params, platform] = await Promise.all([searchParams, getPlatformIdentity()]);
  return <AuthShell><AuthClient mode="verify" token={params.token || ""} platformName={platform.shortName} /></AuthShell>;
}
