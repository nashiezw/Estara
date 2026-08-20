"use client";

import { FormEvent, useEffect, useState } from "react";

type Mode = "login" | "register" | "forgot" | "reset" | "verify";

export default function AuthClient({ mode, token = "" }: { mode: Mode; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (mode !== "verify" || !token) return;
    void submitJson("/api/auth/verify-email", { token }, "Your email is verified. Opening your workspace now.");
  }, [mode, token]);

  async function submitJson(url: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    setPreviewUrl("");
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "That did not work.");
      setMessage(result.nextStep || success);
      setPreviewUrl(result.verificationPreviewUrl || result.resetPreviewUrl || "");
      if (url.includes("login") || url.includes("verify-email")) window.location.href = "/workspace";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  const handle = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (mode === "login") void submitJson("/api/auth/login", data, "Signed in.");
    if (mode === "register") void submitJson("/api/auth/register", data, "Account created. Check your email to verify it.");
    if (mode === "forgot") void submitJson("/api/auth/forgot-password", data, "If an account exists, a reset email will be sent.");
    if (mode === "reset") void submitJson("/api/auth/reset-password", { ...data, token }, "Password changed. You can log in now.");
  };

  return (
    <div className="auth-card">
      <span>{mode === "login" ? "Secure login" : mode === "register" ? "Create account" : mode === "forgot" ? "Account recovery" : mode === "reset" ? "New password" : "Email verification"}</span>
      <h2>{title(mode)}</h2>
      <p>{copy(mode)}</p>
      {message && <div className="auth-message success">{message}</div>}
      {error && <div className="auth-message error">{error}</div>}
      {mode === "verify" && !token && <div className="auth-message error">This verification link is missing its token.</div>}
      {mode !== "verify" && (
        <form onSubmit={handle}>
          {mode === "register" && <label>Name<input name="displayName" autoComplete="name" required /></label>}
          {(mode === "login" || mode === "register" || mode === "forgot") && <label>Email<input name="email" type="email" autoComplete="email" required /></label>}
          {(mode === "login" || mode === "register" || mode === "reset") && <label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={10} /></label>}
          <button disabled={busy}>{busy ? "Working..." : button(mode)}</button>
        </form>
      )}
      {previewUrl && <div className="auth-preview"><strong>Local preview link</strong><p>Email delivery is not connected locally, so use this test link:</p><a href={previewUrl}>{previewUrl}</a></div>}
      <div className="auth-links">
        {mode !== "login" && <a href="/login">Log in</a>}
        {mode !== "register" && <a href="/register">Create account</a>}
        {mode !== "forgot" && mode !== "reset" && <a href="/forgot-password">Forgot password?</a>}
      </div>
    </div>
  );
}

function title(mode: Mode) {
  if (mode === "register") return "Start your ESTARA workspace.";
  if (mode === "forgot") return "Reset access safely.";
  if (mode === "reset") return "Choose a new password.";
  if (mode === "verify") return "Verifying your email.";
  return "Welcome back.";
}

function copy(mode: Mode) {
  if (mode === "register") return "Create your owner account. You will verify your email before entering the workspace.";
  if (mode === "forgot") return "Enter your email and ESTARA will prepare a reset link if the account exists.";
  if (mode === "reset") return "Use at least 10 characters with letters and numbers.";
  if (mode === "verify") return "We are checking your secure verification link and will open the workspace when it succeeds.";
  return "Log in with the email and password connected to your agency.";
}

function button(mode: Mode) {
  if (mode === "register") return "Create account";
  if (mode === "forgot") return "Send reset link";
  if (mode === "reset") return "Change password";
  return "Log in";
}
