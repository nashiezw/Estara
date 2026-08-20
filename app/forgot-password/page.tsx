import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <AuthShell><AuthClient mode="forgot" /></AuthShell>;
}
