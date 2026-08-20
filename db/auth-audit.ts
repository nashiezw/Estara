import { env } from "cloudflare:workers";

export async function writeAuthAudit(action: string, resource: string, actorUserId?: string | null) {
  try {
    await env.DB.prepare("INSERT INTO audit_logs (id,agency_id,actor_user_id,action,resource_type,resource_id,detail) VALUES (?,NULL,?,?,?,?,?)")
      .bind(crypto.randomUUID(), actorUserId || "public-auth", action, "auth", await hashAuditResource(resource), "{}").run();
  } catch (error) {
    console.warn("Auth audit was skipped because the audit table is not ready.", error);
  }
}

async function hashAuditResource(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim().toLowerCase().slice(0, 254))));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
