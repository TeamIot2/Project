import { apiUrl } from "../api";

export function resolveAvatarSrc(avatarUrl: string | null | undefined): string | null {
  const trimmed = avatarUrl?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/api/")) return apiUrl(trimmed.slice(4));
  return trimmed;
}
