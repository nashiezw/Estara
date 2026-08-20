import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <AuthShell><AuthClient mode="login" /></AuthShell>;
}
