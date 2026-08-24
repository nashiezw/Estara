import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";
import { getPlatformIdentity } from "../../db/platform-settings";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const platform = await getPlatformIdentity();
  return <AuthShell><AuthClient mode="register" platformName={platform.shortName} /></AuthShell>;
}
