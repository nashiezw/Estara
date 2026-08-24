import Link from "next/link";
import { getPlatformIdentity } from "../db/platform-settings";
import "./auth.css";

export default async function AuthShell({ children }: { children: React.ReactNode }) {
  const platform = await getPlatformIdentity();
  const icon = platform.darkIconUrl || platform.iconUrl;
  const logo = platform.darkLogoUrl || platform.logoUrl;
  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <Link href="/" className="auth-mark">
          {icon ? <img className="auth-mark-icon" src={icon} alt="" /> : <i>{platform.shortName.slice(0, 1)}</i>}
          <span>{logo ? <img className="auth-mark-logo" src={logo} alt={`${platform.shortName} logo`} /> : platform.shortName}<small>{platform.descriptor}</small></span>
        </Link>
        <div>
          <h1>Run your agency from one secure account.</h1>
          <p>Properties, enquiries, viewings, seller reports and daily next actions all start behind a verified {platform.shortName} login.</p>
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
