import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";
import { getChatGPTUser, safeRelativeReturnPath } from "../chatgpt-auth";
import { getPlatformIdentity } from "../../db/platform-settings";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams?: Promise<{ return_to?: string }> }) {
  const params = await searchParams;
  if (await getChatGPTUser()) redirect(safeRelativeReturnPath(params?.return_to || "/workspace"));
  const platform = await getPlatformIdentity();
  return <AuthShell><AuthClient mode="register" platformName={platform.shortName} /></AuthShell>;
}
