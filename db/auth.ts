import { env } from "cloudflare:workers";
import { ensureStandaloneAuthSchema } from "./standalone-auth-schema";

export type EstaraUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
};

export const SESSION_COOKIE = "estara_session";
const encoder = new TextEncoder();
const PASSWORD_ITERATIONS = 100000;
const TOKEN_BYTES = 32;

export function normalizeAuthEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

export function cleanDisplayName(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 120) : "";
}

export function validatePassword(value: unknown) {
  const password = typeof value === "string" ? value : "";
  if (password.length < 10) throw new Error("Use at least 10 characters for your password.");
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("Use letters and numbers in your password.");
  }
  if (password.length > 160) throw new Error("Use a shorter password.");
  return password;
}

export function validateEmail(value: unknown) {
  const email = normalizeAuthEmail(value);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  return email;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${base64url(salt)}$${base64url(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, iterationsRaw, saltRaw, hashRaw] = stored.split("$");
  const iterations = Number(iterationsRaw);
  if (scheme !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 100000) return false;
  const salt = fromBase64url(saltRaw);
  const expected = fromBase64url(hashRaw);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, expected.byteLength * 8);
  return constantTimeEqual(new Uint8Array(bits), expected);
}

export async function createAppUser(input: { email: string; displayName: string; password: string }) {
  await ensureStandaloneAuthSchema();
  const email = validateEmail(input.email);
  const displayName = cleanDisplayName(input.displayName) || email.split("@")[0];
  const existing = await env.DB.prepare("SELECT id FROM app_users WHERE email_normalized=?").bind(email).first();
  if (existing) throw new Error("An account with this email already exists.");
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO app_users(id,email_normalized,display_name,password_hash) VALUES(?,?,?,?)")
    .bind(id, email, displayName, await hashPassword(validatePassword(input.password))).run();
  const verification = await createEmailVerificationToken(id, email);
  return { userId: id, email, displayName, verificationToken: verification.token, verificationExpiresAt: verification.expiresAt };
}

export async function authenticatePassword(emailInput: unknown, passwordInput: unknown) {
  await ensureStandaloneAuthSchema();
  const email = validateEmail(emailInput);
  const password = typeof passwordInput === "string" ? passwordInput : "";
  const user = await env.DB.prepare("SELECT id,email_normalized AS email,display_name AS displayName,password_hash AS passwordHash,email_verified_at AS emailVerifiedAt,disabled_at AS disabledAt FROM app_users WHERE email_normalized=?")
    .bind(email).first<any>();
  if (!user || user.disabledAt || !await verifyPassword(password, user.passwordHash)) {
    throw new Error("Email or password is incorrect.");
  }
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName || user.email,
    fullName: user.displayName || null,
    emailVerified: Boolean(user.emailVerifiedAt),
  } satisfies EstaraUser;
}

export async function createSession(userId: string, meta: { userAgent?: string; ip?: string } = {}) {
  await ensureStandaloneAuthSchema();
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 864e5).toISOString();
  const ipHash = meta.ip ? await sha256Hex(meta.ip) : null;
  await env.DB.prepare("INSERT INTO auth_sessions(id,user_id,token_hash,user_agent,ip_hash,expires_at) VALUES(?,?,?,?,?,?)")
    .bind(id, userId, tokenHash, (meta.userAgent || "").slice(0, 240), ipHash, expiresAt).run();
  return { token, expiresAt };
}

export async function userFromSessionToken(token: string): Promise<EstaraUser | null> {
  await ensureStandaloneAuthSchema();
  if (!token || token.length < 32) return null;
  const row = await env.DB.prepare(`SELECT u.id,u.email_normalized AS email,u.display_name AS displayName,u.email_verified_at AS emailVerifiedAt
    FROM auth_sessions s JOIN app_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>CURRENT_TIMESTAMP AND u.disabled_at IS NULL`)
    .bind(await sha256Hex(token)).first<any>();
  if (!row) return null;
  return { userId: row.id, email: row.email, displayName: row.displayName || row.email, fullName: row.displayName || null, emailVerified: Boolean(row.emailVerifiedAt) };
}

export async function revokeSession(token: string) {
  await ensureStandaloneAuthSchema();
  if (!token) return;
  await env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE token_hash=? AND revoked_at IS NULL")
    .bind(await sha256Hex(token)).run();
}

export async function createEmailVerificationToken(userId: string, email: string) {
  await ensureStandaloneAuthSchema();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO auth_email_verification_tokens(id,user_id,email_normalized,token_hash,expires_at) VALUES(?,?,?,?,?)")
    .bind(crypto.randomUUID(), userId, email, await sha256Hex(token), expiresAt).run();
  return { token, expiresAt };
}

export async function verifyEmailToken(token: string) {
  await ensureStandaloneAuthSchema();
  const row = await env.DB.prepare("SELECT id,user_id AS userId,email_normalized AS email FROM auth_email_verification_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP")
    .bind(await sha256Hex(token)).first<any>();
  if (!row) throw new Error("This verification link is invalid or expired.");
  await env.DB.batch([
    env.DB.prepare("UPDATE auth_email_verification_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id),
    env.DB.prepare("UPDATE app_users SET email_verified_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=? AND email_normalized=?").bind(row.userId, row.email),
  ]);
  return { userId: row.userId, email: row.email };
}

export async function createPasswordResetToken(emailInput: unknown) {
  await ensureStandaloneAuthSchema();
  const email = validateEmail(emailInput);
  const user = await env.DB.prepare("SELECT id,email_normalized AS email FROM app_users WHERE email_normalized=? AND disabled_at IS NULL").bind(email).first<any>();
  if (!user) return null;
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO auth_password_reset_tokens(id,user_id,email_normalized,token_hash,expires_at) VALUES(?,?,?,?,?)")
    .bind(crypto.randomUUID(), user.id, user.email, await sha256Hex(token), expiresAt).run();
  return { token, expiresAt, email: user.email };
}

export async function resetPasswordWithToken(token: string, passwordInput: unknown) {
  await ensureStandaloneAuthSchema();
  const row = await env.DB.prepare("SELECT id,user_id AS userId FROM auth_password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>CURRENT_TIMESTAMP")
    .bind(await sha256Hex(token)).first<any>();
  if (!row) throw new Error("This reset link is invalid or expired.");
  const passwordHash = await hashPassword(validatePassword(passwordInput));
  await env.DB.batch([
    env.DB.prepare("UPDATE app_users SET password_hash=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(passwordHash, row.userId),
    env.DB.prepare("UPDATE auth_password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id),
    env.DB.prepare("UPDATE auth_sessions SET revoked_at=CURRENT_TIMESTAMP WHERE user_id=? AND revoked_at IS NULL").bind(row.userId),
  ]);
  return { userId: row.userId };
}

export function publicAuthPreviewEnabled(request: Request) {
  const host = new URL(request.url).hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export async function sha256Hex(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  return base64url(crypto.getRandomValues(new Uint8Array(TOKEN_BYTES)));
}

function base64url(bytes: Uint8Array) {
  let raw = "";
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let index = 0; index < a.byteLength; index++) diff |= a[index] ^ b[index];
  return diff === 0;
}
