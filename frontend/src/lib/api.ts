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
    userThreads: (username: string) =>
        `${API_BASE_URL}/threads/user/${username}`,
    threadSearch: `${API_BASE_URL}/threads/search`,
    threadTagRecommendations: `${API_BASE_URL}/threads/ai/tags`,
    threadDuplicateCheck: `${API_BASE_URL}/threads/ai/duplicates`,

    // Tags
    tags: `${API_BASE_URL}/tags`,

    // Comments
    commentsBase: `${API_BASE_URL}/comments`,
    comments: (threadId: string) => `${API_BASE_URL}/threads/${threadId}/comments`,
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
    markNotificationRead: (id: string) => `${API_BASE_URL}/notifications/${id}/read`,
    markAllNotificationsRead: `${API_BASE_URL}/notifications/read`,
    notificationsStream: `${API_BASE_URL}/notifications/stream`,
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

    if (res.status === 401 || res.status === 403) {
        // Token expired or invalid — clear session and redirect
        clearAuth();
        if (
            typeof window !== "undefined" &&
            !window.location.pathname.startsWith("/login")
        ) {
            window.location.href = "/login";
        }
    }

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new Error(text || `HTTP ${res.status}`);
    }

    if (res.status === 204) return null as T;

    const contentType = res.headers.get("content-type") ?? "";
    const text = await res.text();
    if (!text.trim()) return null as T;
    if (contentType.includes("application/json")) return JSON.parse(text) as T;
    return text as T;
}
