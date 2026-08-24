import { requireChatGPTUser } from "../chatgpt-auth";
import PlatformToolHeader from "../components/PlatformToolHeader";
import "../management/management.css";
import { openApiSpec } from "../../db/openapi";
import { getPlatformIdentity } from "../../db/platform-settings";

export const dynamic = "force-dynamic";

const sampleWebhook = `const crypto = require("crypto");
function verify(rawBody, header, secret) {
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}`;

export default async function Page() {
  await requireChatGPTUser("/api-docs");
  const platform = await getPlatformIdentity(), brand = { shortName: platform.shortName, platformName: platform.platformName, logoUrl: platform.logoUrl, iconUrl: platform.iconUrl, darkLogoUrl: platform.darkLogoUrl, darkIconUrl: platform.darkIconUrl, primaryColor: platform.primaryColor, accentColor: platform.accentColor };
  const paths = Object.keys(openApiSpec.paths);
  return <main className="pm-shell"><PlatformToolHeader platform={brand} section="API docs" />
    <header className="pm-hero"><div><p className="pm-kicker">ESTARA CONNECT</p><h1>Build against a stable contract.</h1><p>Use bearer credentials, least-privilege scopes, idempotency keys, field maps and signed webhooks to connect websites, portals and CRMs.</p><div className="pm-hero-actions"><a className="pm-primary" href="/api/openapi">Download OpenAPI JSON</a><a className="pm-secondary" href="/developer">Manage API credentials</a><a className="pm-secondary" href="/integrations">Open integrations</a></div></div></header>
    <section className="pm-grid">
      <article className="pm-panel pm-wide"><p className="pm-kicker">ENDPOINTS</p><h2>Version 1 surface</h2>{paths.map(path => <div className="pm-row" key={path}><div><strong><code>{path}</code></strong><small>{Object.keys((openApiSpec.paths as any)[path]).join(", ").toUpperCase()}</small></div></div>)}</article>
      <article className="pm-panel"><p className="pm-kicker">AUTHENTICATION</p><h2>Bearer credentials</h2><p>Send <code>Authorization: Bearer est_live_...</code>. Credentials can be scoped, IP-allowlisted, rotated and measured per endpoint.</p><pre>{`curl -H "Authorization: Bearer est_live_xxx" https://app.estara.co.zw/api/v1/properties`}</pre></article>
      <article className="pm-panel"><p className="pm-kicker">IDEMPOTENCY</p><h2>Safe writes</h2><p>Send <code>Idempotency-Key</code> on POST requests. Estara returns the stored response on retry so website forms can safely resubmit.</p><pre>{`Idempotency-Key: website-lead-1042`}</pre></article>
      <article className="pm-panel"><p className="pm-kicker">FIELD MAPS</p><h2>Use your field names</h2><p>Pass <code>fieldMap</code> in an API request or save mapping templates per connector in Integrations.</p><pre>{`{"fieldMap":{"fullName":"your-name","email":"your-email"}}`}</pre></article>
      <article className="pm-panel"><p className="pm-kicker">WEBHOOKS</p><h2>Verify signatures</h2><p>Compare <code>x-estara-signature</code> against HMAC-SHA256 of the raw body using the webhook secret.</p><pre>{sampleWebhook}</pre></article>
      <article className="pm-panel"><p className="pm-kicker">ERRORS</p><h2>Common responses</h2><p><code>400</code> validation, scope, IP or rate failure. <code>401</code> missing credential. <code>403</code> tenant authorization. <code>422</code> business rule failure.</p></article>
    </section>
  </main>;
}
