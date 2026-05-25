export const API_BASE_URL = import.meta.env.VITE_SPRING_BOOT_API_URL ?? "/api";

export const API_ENDPOINTS = {
  // Auth
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  logout: `${API_BASE_URL}/auth/logout`,

  // Users
  promote: (id: string) => `${API_BASE_URL}/users/${id}/promote`,
  demote: (id: string) => `${API_BASE_URL}/users/${id}/demote`,
  suspend: (id: string) => `${API_BASE_URL}/users/${id}/suspend`,
  deleteUser: (id: string) => `${API_BASE_URL}/users/${id}`,
  users: `${API_BASE_URL}/users`,

  // Threads
  threads: `${API_BASE_URL}/threads`,
  threadExpand: (username: string, id: string) => `${API_BASE_URL}/threads/${username}/${id}`,
  threadById: (id: string) => `${API_BASE_URL}/threads/${id}`,
  userThreads: (username: string) => `${API_BASE_URL}/threads/user/${username}`,
  threadSearch: `${API_BASE_URL}/threads/search`,

  // Tags (NEW - To fetch tags for the "Ask Question" form)
  tags: `${API_BASE_URL}/tags`,

  // Comments
  commentsBase: `${API_BASE_URL}/comments`, // NEW - Use this for POST (creating comments)
  comments: (threadId: string) => `${API_BASE_URL}/comments/${threadId}`, // Use this for GET (fetching comments)
  commentReplies: (commentId: string) => `${API_BASE_URL}/comments/${commentId}/replies`,
  commentById: (commentId: string) => `${API_BASE_URL}/comments/${commentId}`, // Use this for PATCH/DELETE

  // Interactions
  bookmarks: `${API_BASE_URL}/interactions/bookmarks`,
  bookmarkThread: (threadId: string) => `${API_BASE_URL}/interactions/bookmarks/${threadId}`,
  voteComment: (commentId: string) => `${API_BASE_URL}/interactions/comments/${commentId}/votes`,
} as const;

const TOKEN_KEY = "tf_access_token";
const USER_KEY = "tf_user";

export interface StoredUser {
    username: string;
    email: string;
    role: string;
    // Optional: backend may not include this on every auth response,
    // but components (e.g. profile.tsx) expect it. Keep optional to
    // avoid runtime issues when missing.
    isSuspended?: boolean;
}

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

export async function apiFetch<T = unknown>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const token = localStorage.getItem("tf_access_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...options.headers,
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {...options, headers});

    if (res.status === 403) {
      console.error("Access forbidden: Token may be expired or invalid.");
      // window.location.href = "/login";
    }

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || `HTTP ${res.status}`);
    }

    if (res.status === 204) return null as T;
    return res.json() as Promise<T>;
}
