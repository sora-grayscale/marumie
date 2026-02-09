import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export async function loginWithPasskey(): Promise<boolean> {
  const optionsRes = await fetch(`${API_BASE}/auth/passkey/login/options`, {
    credentials: "include",
  });
  const options = await optionsRes.json();
  const credential = await startAuthentication({ optionsJSON: options });
  const verifyRes = await fetch(`${API_BASE}/auth/passkey/login/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credential),
    credentials: "include",
  });
  return verifyRes.ok;
}

export async function registerPasskey(): Promise<boolean> {
  const optionsRes = await fetch(`${API_BASE}/auth/passkey/register/options`, {
    credentials: "include",
  });
  const options = await optionsRes.json();
  const credential = await startRegistration({ optionsJSON: options });
  const verifyRes = await fetch(`${API_BASE}/auth/passkey/register/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credential),
    credentials: "include",
  });
  return verifyRes.ok;
}

export async function loginWithPassword(email: string, password: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  return res.ok;
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
}

export interface SessionInfo {
  user_id: string;
  email: string;
  name: string;
  role: string;
}

export async function checkSession(): Promise<SessionInfo> {
  const res = await fetch(`${API_BASE}/auth/session`, { credentials: "include" });
  if (!res.ok) {
    throw new Error("Unauthorized");
  }
  return res.json();
}
