const encoder = new TextEncoder();

export const SESSION_COOKIE_NAME = "avyts_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const DEFAULT_PROTECTED_REDIRECT = "/map";

type SessionPayload = {
  username: string;
  exp: number;
};

type ConfiguredUser = {
  username: string;
  password: string;
};

function getConfiguredUsername() {
  return process.env.AVYTS_ADMIN_USERNAME?.trim() || "admin";
}

function getConfiguredPassword() {
  return process.env.AVYTS_ADMIN_PASSWORD?.trim() || "";
}

function getConfiguredSecret() {
  return process.env.AVYTS_AUTH_SECRET?.trim() || "";
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function parseAdditionalUsers() {
  const rawUsers = process.env.AVYTS_ALLOWED_USERS?.trim() || "";
  if (!rawUsers) {
    return [] as ConfiguredUser[];
  }

  return rawUsers
    .split(/\r?\n|;/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const equalsIndex = entry.indexOf("=");
      const colonIndex = entry.indexOf(":");
      const splitIndex = equalsIndex > 0 ? equalsIndex : colonIndex > 0 ? colonIndex : -1;

      if (splitIndex < 0) {
        return [];
      }

      const username = normalizeUsername(entry.slice(0, splitIndex));
      const password = entry.slice(splitIndex + 1).trim();

      if (!username || !password) {
        return [];
      }

      return [{ username, password } satisfies ConfiguredUser];
    });
}

function getConfiguredUsers() {
  const users = new Map<string, string>();
  const adminPassword = getConfiguredPassword();

  if (adminPassword) {
    users.set(normalizeUsername(getConfiguredUsername()), adminPassword);
  }

  parseAdditionalUsers().forEach((user) => {
    users.set(user.username, user.password);
  });

  return users;
}

export function isAuthConfigured() {
  return Boolean(getConfiguredSecret() && getConfiguredUsers().size > 0);
}

function normalizeHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function signValue(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getConfiguredSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return normalizeHex(new Uint8Array(signature));
}

export async function createSessionToken(username: string) {
  const payload = JSON.stringify({ username, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 } satisfies SessionPayload);
  const encodedPayload = encodeURIComponent(payload);
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  if (!token || !isAuthConfigured()) {
    return null;
  }

  const splitIndex = token.lastIndexOf(".");
  if (splitIndex < 0) {
    return null;
  }

  const encodedPayload = token.slice(0, splitIndex);
  const providedSignature = token.slice(splitIndex + 1);
  const expectedSignature = await signValue(encodedPayload);

  if (providedSignature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeURIComponent(encodedPayload)) as SessionPayload;
    if (!payload.username || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function authenticateAdmin(username: string, password: string) {
  if (!isAuthConfigured()) {
    return false;
  }

  const expectedPassword = getConfiguredUsers().get(normalizeUsername(username));
  return Boolean(expectedPassword && password === expectedPassword);
}

export function normalizeRedirectPath(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_PROTECTED_REDIRECT;
  }

  return value;
}

export function isProtectedAppPath(pathname: string) {
  return pathname === "/map"
    || pathname === "/conditions"
    || pathname === "/observations"
    || pathname === "/reports";
}

export function isProtectedApiPath(pathname: string) {
  return pathname === "/api/observations/submit" || pathname.startsWith("/api/sherpai/");
}