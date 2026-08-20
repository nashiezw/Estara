import Link from "next/link";
import { getPlatformIdentity } from "../db/platform-settings";
import "./auth.css";

export default async function AuthShell({ children }: { children: React.ReactNode }) {
  const platform = await getPlatformIdentity();
  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <Link href="/" className="auth-mark">
          <i>{platform.shortName.slice(0, 1)}</i>
          <span>{platform.shortName}<small>{platform.descriptor}</small></span>
        </Link>
        <div>
          <h1>Run your agency from one secure account.</h1>
          <p>Properties, enquiries, viewings, seller reports and daily next actions all start behind a verified ESTARA login.</p>
        </div>
        <div className="auth-proof">
          <span>Email verification</span>
          <span>Secure sessions</span>
          <span>Password recovery</span>
          <span>Agency role checks</span>
        </div>
      </section>
      <section className="auth-panel">{children}</section>
    </main>
  );
}
