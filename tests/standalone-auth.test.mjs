import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("standalone auth stores hashed passwords and token hashes only", async () => {
  const [auth, migration] = await Promise.all([read("db/auth.ts"), read("drizzle/0028_standalone_auth.sql")]);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /PASSWORD_ITERATIONS = 150000/);
  assert.match(auth, /sha256Hex\(token\)/);
  assert.match(migration, /password_hash TEXT NOT NULL/);
  assert.match(migration, /token_hash TEXT NOT NULL/g);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS app_users/);
  assert.match(migration, /CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_sessions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_email_verification_tokens/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_password_reset_tokens/);
  assert.doesNotMatch(migration, /\bpassword TEXT\b/);
  assert.doesNotMatch(migration, /\btoken TEXT\b/);
});

test("standalone auth verifies email before workspace login and protects sessions", async () => {
  const [login, register, forgot, verify, reset, cookie, authHelper, email, authSchema, audit] = await Promise.all([
    read("app/api/auth/login/route.ts"),
    read("app/api/auth/register/route.ts"),
    read("app/api/auth/forgot-password/route.ts"),
    read("app/api/auth/verify-email/route.ts"),
    read("app/api/auth/reset-password/route.ts"),
    read("app/api/auth/cookie.ts"),
    read("app/chatgpt-auth.ts"),
    read("db/email.ts"),
    read("db/standalone-auth-schema.ts"),
    read("db/auth-audit.ts"),
  ]);
  assert.match(register, /createAppUser/);
  assert.doesNotMatch(register, /setAuthCookie/);
  assert.match(register, /Email delivery must be configured before public registration can open/);
  assert.match(login, /Verify your email before logging in/);
  assert.match(login, /sendAuthEmail/);
  assert.match(forgot, /Email delivery must be configured before password reset can open/);
  assert.match(verify, /verifyEmailToken/);
  assert.match(verify, /setAuthCookie/);
  assert.match(reset, /resetPasswordWithToken/);
  assert.match(cookie, /httpOnly:\s*true/);
  assert.match(cookie, /sameSite:\s*"lax"/);
  assert.match(authHelper, /userFromSessionToken/);
  assert.match(authHelper, /SESSION_COOKIE/);
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /RESEND_API_KEY/);
  assert.match(email, /RESEND_FROM_EMAIL/);
  for (const route of [login, register, forgot, verify, reset]) {
    assert.match(route, /ensureStandaloneAuthSchema\(\)/);
    assert.match(route, /authRouteErrorResponse/);
    assert.doesNotMatch(route, /error instanceof Error \? error\.message/);
  }
  assert.match(authSchema, /CREATE TABLE IF NOT EXISTS app_users/);
  assert.match(authSchema, /CREATE TABLE IF NOT EXISTS auth_sessions/);
  assert.match(authSchema, /CREATE TABLE IF NOT EXISTS auth_email_verification_tokens/);
  assert.match(authSchema, /CREATE TABLE IF NOT EXISTS auth_password_reset_tokens/);
  assert.match(authSchema, /D1_ERROR\|SQLITE_ERROR/);
  assert.match(audit, /try\s*\{/);
  assert.match(audit, /console\.warn/);
  for (const route of [login, register, forgot, verify, reset]) {
    assert.match(route, /from "\.\.\/\.\.\/\.\.\/\.\.\/db\/auth-audit"/);
    assert.doesNotMatch(route, /INSERT INTO audit_logs/);
  }
});

test("public navigation exposes real ESTARA auth pages", async () => {
  const [home, userMenu, status] = await Promise.all([
    read("app/page.tsx"),
    read("app/components/UserMenu.tsx"),
    read("docs/PROJECT_STATUS.md"),
  ]);
  assert.match(home, /href="\/login"/);
  assert.match(home, /href="\/register"/);
  assert.match(userMenu, /\/api\/auth\/logout/);
  assert.match(status, /standalone ESTARA email\/password authentication/);
});
