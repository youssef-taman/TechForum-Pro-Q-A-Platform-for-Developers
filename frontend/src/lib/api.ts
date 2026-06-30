export const API_BASE_URL = import.meta.env.VITE_SPRING_BOOT_API_URL ?? "/api";

export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  logout: `${API_BASE_URL}/auth/logout`,
  requestPasswordReset: `${API_BASE_URL}/auth/password-reset/request`,
  confirmPasswordReset: `${API_BASE_URL}/auth/password-reset/confirm`,
  changePassword: `${API_BASE_URL}/auth/change-password`, // ← new authenticated endpoint
  requestEmailVerification: `${API_BASE_URL}/auth/email-verification/request`,
  confirmEmailVerification: `${API_BASE_URL}/auth/email-verification/confirm`,

  // Users
  promote: (id: string) => `${API_BASE_URL}/users/${id}/promote`,
  demote: (id: string) => `${API_BASE_URL}/users/${id}/demote`,
  suspend: (id: string) => `${API_BASE_URL}/users/${id}/suspend`,
  unsuspend: (id: string) => `${API_BASE_URL}/users/${id}/unsuspend`, // ← new
  deleteUser: (id: string) => `${API_BASE_URL}/users/${id}`,
  users: `${API_BASE_URL}/users`,

  // Threads
  threads: `${API_BASE_URL}/threads`,
  threadById: (id: string) => `${API_BASE_URL}/threads/${id}`,
  threadExpand: (username: string, id: string) =>
    `${API_BASE_URL}/threads/${username}/${id}`,
  userThreads: (username: string) => `${API_BASE_URL}/threads/user/${username}`,
  threadSearch: `${API_BASE_URL}/threads/search`,
  threadTagRecommendations: `${API_BASE_URL}/threads/suggestTags`,
  threadDuplicateCheck: `${API_BASE_URL}/threads/duplicates`,

  // Tags
  tags: `${API_BASE_URL}/tags`,

  // Comments
  commentsBase: `${API_BASE_URL}/comments`,
  comments: (threadId: string) => `${API_BASE_URL}/comments/${threadId}`,
  commentReplies: (commentId: string) =>
    `${API_BASE_URL}/comments/${commentId}/replies`,
  commentById: (commentId: string) => `${API_BASE_URL}/comments/${commentId}`,

  // Interactions
  bookmarks: `${API_BASE_URL}/interactions/bookmarks`,
  bookmarkThread: (threadId: string) =>
    `${API_BASE_URL}/interactions/bookmarks/${threadId}`,
  voteComment: (commentId: string) =>
    `${API_BASE_URL}/interactions/comments/${commentId}/votes`,
  // Notifications
  notifications: `${API_BASE_URL}/notifications`,
  markNotificationRead: (id: string) =>
    `${API_BASE_URL}/notifications/${id}/read`,
  markAllNotificationsRead: `${API_BASE_URL}/notifications/read`,
  notificationsStream: `${API_BASE_URL}/notifications/stream`,
  notificationsUnreadCount: `${API_BASE_URL}/notifications/unread-count`,

  modPendingThreads: `${API_BASE_URL}/threads/moderation/pending`,
  moderateThread: (id: string) => `${API_BASE_URL}/threads/${id}/moderate`,

  userMetrics: `${API_BASE_URL}/users/metrics`,
} as const;

const TOKEN_KEY = "tf_access_token";
const USER_KEY = "tf_user";

export interface StoredUser {
  username: string;
  email: string;
  role: string;
  isSuspended?: boolean;
}

export type AuthResponse = {
  accessToken: string;
  username: string;
  email: string;
  role: string;
};

export function saveAuth(token: string, user: StoredUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Typed API error ──────────────────────────────────────────────────────────
// Thrown by apiFetch on any non-2xx response.
// `message`  — human-readable string safe to display directly to users
// `status`   — HTTP status code (401, 403, 404, 422, 500 …)
// `fields`   — optional field-level validation errors from the backend
export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(
    message: string,
    status: number,
    fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

// ── Friendly message map ──────────────────────────────────────────────────────
// Maps backend messages or HTTP status codes to beginner-friendly copy.
// Add entries here as new backend error messages are discovered.
const FRIENDLY_MESSAGES: Record<string, string> = {
  // Auth
  "Invalid credentials":
    "Incorrect username/email or password. Please try again.",
  "User not found": "We couldn't find an account with those details.",
  "Email already in use":
    "That email address is already registered. Try signing in instead.",
  "Username already taken":
    "That username is already taken. Please choose another.",
  "Account suspended":
    "Your account has been suspended. Contact support for help.",
  "Email not verified": "Please verify your email address before signing in.",
  "Token expired": "Your session has expired. Please sign in again.",
  "Invalid token": "This link is no longer valid. Please request a new one.",
  // Generic HTTP fallbacks
  "HTTP 400":
    "Something looks wrong with your request. Please check your input.",
  "HTTP 404": "We couldn't find what you were looking for.",
  "HTTP 409": "A conflict occurred — this item may already exist.",
  "HTTP 422": "Some fields are invalid. Please review your input.",
  "HTTP 429": "Too many requests. Please wait a moment and try again.",
  "HTTP 500": "Something went wrong on our end. Please try again shortly.",
  "HTTP 503": "The service is temporarily unavailable. Please try again soon.",
};

function toFriendlyMessage(raw: string, status: number): string {
  // Exact match on backend message
  if (FRIENDLY_MESSAGES[raw]) return FRIENDLY_MESSAGES[raw];
  // HTTP status fallback
  const statusKey = `HTTP ${status}`;
  if (FRIENDLY_MESSAGES[statusKey]) return FRIENDLY_MESSAGES[statusKey];
  // If the raw message is suspiciously technical (contains { or stack traces), hide it
  if (
    raw.startsWith("{") ||
    raw.includes("Exception") ||
    raw.includes("Error:")
  ) {
    return "An unexpected error occurred. Please try again.";
  }
  // Otherwise the backend message is already user-friendly enough
  return raw;
}

export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(url, {...options, headers});

  if (!res.ok) {
    // On 401/403: clear local auth state. Only redirect if NOT already on an
    // auth page so we don't loop — and only for session expiry (403/401 on
    // non-login endpoints), not for bad credentials on /auth/login itself.
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login") &&
      !url.includes("/auth/")
    ) {
      clearAuth();
      window.location.href = "/login";
    }

    const rawText = await res.text().catch(() => "");
    let rawMessage = `HTTP ${res.status}`;
    let fields: Record<string, string> | undefined;

    if (rawText) {
      try {
        const json = JSON.parse(rawText);
        // Backend shape: { status, message, errors }
        if (typeof json.message === "string") rawMessage = json.message;
        if (json.errors && typeof json.errors === "object")
          fields = json.errors;
      } catch {
        // Not JSON — use raw text if it looks safe
        rawMessage = rawText.trim() || rawMessage;
      }
    }

    throw new ApiError(
      toFriendlyMessage(rawMessage, res.status),
      res.status,
      fields,
    );
  }

  if (res.status === 204) return null as T;

  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!text.trim()) return null as T;
  if (contentType.includes("application/json")) return JSON.parse(text) as T;
  return text as T;
}
