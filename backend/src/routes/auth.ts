/**
 * Auth Routes
 *
 * POST /api/auth/login   — Login with email + password
 * GET  /api/auth/me      — Get current user from token
 * POST /api/auth/logout   — Logout (no-op for mock)
 */

import { randomBytes } from "crypto";
import { Router, Request, Response } from "express";
import { authenticateToken, generateToken, validateLogin } from "../middleware/auth";
import { LoginRequest } from "../../../shared/types";
import { DEFAULT_PROFILE_AVATAR_URL, updateUserProfileInDb, upsertGoogleUserInDb } from "../services/database";

const router = Router();
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_SCOPES = ["openid", "email", "profile"];
const MAX_PROFILE_NAME_LENGTH = 80;
const MAX_AVATAR_DATA_URL_LENGTH = 8_000_000;
const DEFAULT_TIME_ZONE = "Europe/Prague";
const DATA_IMAGE_URL_PATTERN = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;
const LOCAL_FRONTEND_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);
const oauthStates = new Map<string, { expiresAt: number; frontendRedirectUri: string; returnTo: string }>();

type AvatarValidationResult =
  | { ok: true; value: string | null | undefined }
  | { ok: false; error: string };

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleUserInfo {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function getGoogleClientConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function getBackendBaseUrl(req: Request): string {
  const configured = process.env.GOOGLE_OAUTH_BACKEND_URL ?? process.env.BACKEND_PUBLIC_URL;
  if (configured?.trim()) return configured.trim().replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function getGoogleRedirectUri(req: Request): string {
  return process.env.GOOGLE_REDIRECT_URI?.trim()
    || `${getBackendBaseUrl(req)}/api/auth/google/callback`;
}

function getAllowedFrontendOrigins(): Set<string> {
  const configured = process.env.FRONTEND_ALLOWED_ORIGINS;
  if (!configured?.trim()) return LOCAL_FRONTEND_ORIGINS;
  return new Set(
    configured
      .split(",")
      .map((origin) => origin.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );
}

function resolveFrontendRedirectUri(rawValue: unknown): string {
  const fallback = process.env.FRONTEND_URL?.trim()
    ? `${process.env.FRONTEND_URL.trim().replace(/\/$/, "")}/auth/google/callback`
    : "http://127.0.0.1:5173/auth/google/callback";

  if (typeof rawValue !== "string" || !rawValue.trim()) return fallback;

  try {
    const parsed = new URL(rawValue);
    const origin = parsed.origin;
    if (!getAllowedFrontendOrigins().has(origin)) return fallback;
    if (parsed.pathname !== "/auth/google/callback") return fallback;
    parsed.search = "";
    return parsed.toString().replace(/\?$/, "");
  } catch {
    return fallback;
  }
}

function resolveReturnTo(rawValue: unknown): string {
  if (typeof rawValue !== "string" || !rawValue.startsWith("/")) return "/";
  if (rawValue.startsWith("//") || rawValue.startsWith("/api/")) return "/";
  return rawValue.slice(0, 256);
}

function cleanupExpiredOAuthStates(): void {
  const now = Date.now();
  for (const [state, details] of oauthStates.entries()) {
    if (details.expiresAt <= now) oauthStates.delete(state);
  }
}

function normalizeProfileName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed || trimmed.length > MAX_PROFILE_NAME_LENGTH) return null;
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return null;
  return trimmed;
}

function validateAvatarUrl(value: unknown): AvatarValidationResult {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: "Avatar URL must be a string or null" };
  }

  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed === DEFAULT_PROFILE_AVATAR_URL) return { ok: true, value: trimmed };

  if (trimmed.startsWith("data:image/")) {
    if (trimmed.length > MAX_AVATAR_DATA_URL_LENGTH) {
      return { ok: false, error: "Avatar image is too large" };
    }
    if (!DATA_IMAGE_URL_PATTERN.test(trimmed)) {
      return { ok: false, error: "Avatar image format is not supported" };
    }
    return { ok: true, value: trimmed };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, error: "Avatar URL protocol is not supported" };
    }
    if (trimmed.length > 2048) {
      return { ok: false, error: "Avatar URL is too long" };
    }
    return { ok: true, value: trimmed };
  } catch {
    return { ok: false, error: "Avatar URL is invalid" };
  }
}

function normalizeTimeZone(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_TIME_ZONE;
  const trimmed = value.trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

function redirectToFrontend(
  res: Response,
  frontendRedirectUri: string,
  params: Record<string, string>
): void {
  const hash = new URLSearchParams(params).toString();
  res.redirect(302, `${frontendRedirectUri}#${hash}`);
}

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const result = await validateLogin({ email, password });

  if (!result) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json(result);
});

// GET /api/auth/google/start
router.get("/google/start", (req: Request, res: Response) => {
  cleanupExpiredOAuthStates();

  const frontendRedirectUri = resolveFrontendRedirectUri(req.query.frontend_redirect_uri);
  const returnTo = resolveReturnTo(req.query.return_to);
  const googleConfig = getGoogleClientConfig();

  if (!googleConfig) {
    redirectToFrontend(res, frontendRedirectUri, {
      error: "google_oauth_not_configured",
      return_to: returnTo,
    });
    return;
  }

  const state = randomBytes(24).toString("base64url");
  oauthStates.set(state, {
    expiresAt: Date.now() + 10 * 60 * 1000,
    frontendRedirectUri,
    returnTo,
  });

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", googleConfig.clientId);
  authUrl.searchParams.set("redirect_uri", getGoogleRedirectUri(req));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", "select_account");

  res.redirect(302, authUrl.toString());
});

// GET /api/auth/google/callback
router.get("/google/callback", async (req: Request, res: Response) => {
  cleanupExpiredOAuthStates();

  const state = typeof req.query.state === "string" ? req.query.state : "";
  const stateDetails = oauthStates.get(state);
  if (!stateDetails) {
    redirectToFrontend(res, resolveFrontendRedirectUri(undefined), {
      error: "invalid_oauth_state",
      return_to: "/",
    });
    return;
  }
  oauthStates.delete(state);

  if (typeof req.query.error === "string") {
    redirectToFrontend(res, stateDetails.frontendRedirectUri, {
      error: req.query.error,
      return_to: stateDetails.returnTo,
    });
    return;
  }

  const googleConfig = getGoogleClientConfig();
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!googleConfig || !code) {
    redirectToFrontend(res, stateDetails.frontendRedirectUri, {
      error: "missing_oauth_code",
      return_to: stateDetails.returnTo,
    });
    return;
  }

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        redirect_uri: getGoogleRedirectUri(req),
        grant_type: "authorization_code",
      }),
    });

    const tokenBody = await tokenResponse.json() as GoogleTokenResponse;
    if (!tokenResponse.ok || !tokenBody.access_token) {
      throw new Error(tokenBody.error_description || tokenBody.error || "Google token exchange failed");
    }

    const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
    });
    const userInfo = await userInfoResponse.json() as GoogleUserInfo;

    if (!userInfoResponse.ok || !userInfo.sub || !userInfo.email) {
      throw new Error("Google profile response is missing required identity fields");
    }

    if (userInfo.email_verified === false) {
      throw new Error("Google email is not verified");
    }

    const user = await upsertGoogleUserInDb({
      googleId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.email,
      avatarUrl: userInfo.picture,
    });
    const token = generateToken(user.id);

    redirectToFrontend(res, stateDetails.frontendRedirectUri, {
      token,
      return_to: stateDetails.returnTo,
    });
  } catch (err) {
    console.warn("[Auth] Google OAuth failed:", err instanceof Error ? err.message : err);
    redirectToFrontend(res, stateDetails.frontendRedirectUri, {
      error: "google_login_failed",
      return_to: stateDetails.returnTo,
    });
  }
});

// GET /api/auth/me
router.get("/me", authenticateToken, (req: Request, res: Response) => {
  res.json(req.user);
});

// PATCH /api/auth/me
router.patch("/me", authenticateToken, async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const name = normalizeProfileName(body.name);
  if (!name) {
    res.status(400).json({ error: "Valid profile name is required" });
    return;
  }

  const avatar = validateAvatarUrl(body.avatar_url);
  if (!avatar.ok) {
    res.status(400).json({ error: avatar.error });
    return;
  }
  const timezone = normalizeTimeZone(body.timezone);

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const updatedUser = await updateUserProfileInDb(userId, {
    name,
    timezone,
    ...(avatar.value !== undefined ? { avatarUrl: avatar.value } : {}),
  });

  if (!updatedUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(updatedUser);
});

// POST /api/auth/logout
router.post("/logout", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export default router;
