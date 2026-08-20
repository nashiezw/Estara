import { env } from "cloudflare:workers";
import { getPlatformIdentity } from "./platform-settings";

type AuthEmailKind = "verify" | "reset";

export function emailProviderConfigured() {
  const source = env as unknown as { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string };
  return Boolean(source.RESEND_API_KEY && source.RESEND_FROM_EMAIL);
}

export async function sendAuthEmail(input: { kind: AuthEmailKind; email: string; url: string }) {
  const source = env as unknown as { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string };
  if (!source.RESEND_API_KEY || !source.RESEND_FROM_EMAIL) throw new Error("Email provider is not configured.");
  const platform = await getPlatformIdentity();
  const verify = input.kind === "verify";
  const subject = verify ? `Verify your ${platform.shortName} account` : `Reset your ${platform.shortName} password`;
  const action = verify ? "Verify email" : "Reset password";
  const intro = verify
    ? `Welcome to ${platform.shortName}. Verify your email before opening your agency workspace.`
    : `Use this secure link to choose a new ${platform.shortName} password.`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#f5f7f3;color:#17342d;padding:28px">
    <div style="max-width:620px;margin:auto;background:#fff;border:1px solid #dfe8e3;border-radius:12px;padding:28px">
      <p style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#228876;font-weight:800">${platform.shortName}</p>
      <h1 style="font-family:Georgia,serif;font-size:34px;line-height:1.05;margin:0 0 12px">${subject}</h1>
      <p style="font-size:15px;line-height:1.7;color:#536b63">${intro}</p>
      <p><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#153b34;color:white;text-decoration:none;border-radius:8px;padding:13px 18px;font-weight:800">${action}</a></p>
      <p style="font-size:12px;line-height:1.6;color:#6f817a">If the button does not work, copy this link into your browser:<br>${escapeHtml(input.url)}</p>
      <p style="font-size:12px;color:#6f817a">If you did not request this, you can ignore this email.</p>
    </div>
  </body></html>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${source.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: source.RESEND_FROM_EMAIL, to: input.email, subject, html }),
  });
  if (!response.ok) throw new Error("Email provider rejected the message.");
  return { sent: true };
}

export function authUrl(request: Request, path: string) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}${path}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));
}
