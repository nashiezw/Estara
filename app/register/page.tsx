import AuthClient from "../auth-client";
import AuthShell from "../auth-shell";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <AuthShell><AuthClient mode="register" /></AuthShell>;
}
