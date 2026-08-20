import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <AuthShell><AuthClient mode="reset" token={params.token || ""} /></AuthShell>;
}
