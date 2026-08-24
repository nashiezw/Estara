import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";
import { getPlatformIdentity } from "../../db/platform-settings";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const platform = await getPlatformIdentity();
  return <AuthShell><AuthClient mode="forgot" platformName={platform.shortName} /></AuthShell>;
}
