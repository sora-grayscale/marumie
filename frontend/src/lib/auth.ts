import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export async function loginWithPasskey(): Promise<boolean> {
  const optionsRes = await fetch("/api/auth/webauthn/login/start", {
    credentials: "include",
  });
  const options = await optionsRes.json();
  const credential = await startAuthentication({ optionsJSON: options });
  const verifyRes = await fetch("/api/auth/webauthn/login/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credential),
    credentials: "include",
  });
  return verifyRes.ok;
}

export async function registerPasskey(): Promise<boolean> {
  const optionsRes = await fetch("/api/auth/webauthn/register/start", {
    credentials: "include",
  });
  const options = await optionsRes.json();
  const credential = await startRegistration({ optionsJSON: options });
  const verifyRes = await fetch("/api/auth/webauthn/register/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credential),
    credentials: "include",
  });
  return verifyRes.ok;
}

export async function loginWithPassword(
  email: string,
  password: string,
  masterPassword: string,
  totpCode?: string,
): Promise<{ ok: boolean; totpRequired?: boolean }> {
  const body: Record<string, string> = { email, password, master_password: masterPassword };
  if (totpCode) {
    body.totp_code = totpCode;
  }
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (res.ok) return { ok: true };

  const text = await res.text().catch(() => "");
  if (res.status === 400 && text.includes("TOTP code required")) {
    return { ok: false, totpRequired: true };
  }
  return { ok: false };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export interface SessionInfo {
  id: string;
  email: string;
  display_name: string;
  role: string;
  totp_enabled: boolean;
  must_change_password: boolean;
  created_at: string;
}

export async function checkSession(): Promise<SessionInfo> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unauthorized");
  }
  return res.json();
}
