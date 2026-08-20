import { env } from "cloudflare:workers";

let authSchemaReady: Promise<void> | null = null;

export function ensureStandaloneAuthSchema() {
  authSchemaReady ??= env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email_normalized TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      email_verified_at TEXT,
      disabled_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email_normalized)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      user_agent TEXT NOT NULL DEFAULT '',
      ip_hash TEXT,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token_hash)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_active ON auth_sessions(user_id, revoked_at, expires_at)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_email_verification_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email_normalized TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_email_tokens_hash ON auth_email_verification_tokens(token_hash)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_auth_email_tokens_user ON auth_email_verification_tokens(user_id, used_at, expires_at)"),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email_normalized TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_password_tokens_hash ON auth_password_reset_tokens(token_hash)"),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_auth_password_tokens_user ON auth_password_reset_tokens(user_id, used_at, expires_at)"),
  ]).then(() => undefined).catch((error) => {
    authSchemaReady = null;
    throw error;
  });
  return authSchemaReady;
}

export function authRouteErrorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/D1_ERROR|SQLITE_ERROR|no such (table|column)|database/i.test(message)) {
    console.error("Standalone auth database error", error);
    return Response.json({ error: "Account setup is being prepared. Please try again in a moment." }, { status: 503 });
  }
  return Response.json({ error: message || fallback }, { status: 400 });
}
