export const API_BASE_URL = import.meta.env.VITE_SPRING_BOOT_API_URL ?? "/api";

export const API_ENDPOINTS = {
    // Auth
    login: `${API_BASE_URL}/auth/login`,
    register: `${API_BASE_URL}/auth/register`,
    logout: `${API_BASE_URL}/auth/logout`,

    requestPasswordReset: `${API_BASE_URL}/auth/password-reset/request`,
    confirmPasswordReset: `${API_BASE_URL}/auth/password-reset/confirm`,

    requestEmailVerification: `${API_BASE_URL}/auth/email-verification/request`,
    confirmEmailVerification: `${API_BASE_URL}/auth/email-verification/confirm`,

    // Users
    promote: (id: string) => `${API_BASE_URL}/users/${id}/promote`,
    demote: (id: string) => `${API_BASE_URL}/users/${id}/demote`,
    suspend: (id: string) => `${API_BASE_URL}/users/${id}/suspend`,
    unsuspend: (id: string) => `${API_BASE_URL}/users/${id}/unsuspend`,
    deleteUser: (id: string) => `${API_BASE_URL}/users/${id}`,
    users: `${API_BASE_URL}/users`,
    adminMetrics: `${API_BASE_URL}/admin/metrics`,

    // Threads
    threads: `${API_BASE_URL}/threads`,
    threadTagRecommendations: `${API_BASE_URL}/threads/ai/tags`,
    threadDuplicateCheck: `${API_BASE_URL}/threads/ai/duplicates`,
    threadExpand: (username: string, id: string) =>
        `${API_BASE_URL}/threads/${username}/${id}`,
    threadById: (id: string) => `${API_BASE_URL}/threads/${id}`,
    userThreads: (username: string) =>
        `${API_BASE_URL}/threads/user/${username}`,
    threadSearch: `${API_BASE_URL}/threads/search`,

    // Tags (NEW - To fetch tags for the "Ask Question" form)
    tags: `${API_BASE_URL}/tags`,

    // Comments
    commentsBase: `${API_BASE_URL}/comments`, // NEW - Use this for POST (creating comments)
    comments: (threadId: string) => `${API_BASE_URL}/comments/${threadId}`, // Use this for GET (fetching comments)
    commentReplies: (commentId: string) =>
        `${API_BASE_URL}/comments/${commentId}/replies`,
    commentById: (commentId: string) => `${API_BASE_URL}/comments/${commentId}`, // Use this for PATCH/DELETE

    // Interactions
    bookmarks: `${API_BASE_URL}/interactions/bookmarks`,
    bookmarkThread: (threadId: string) =>
        `${API_BASE_URL}/interactions/bookmarks/${threadId}`,
    voteComment: (commentId: string) =>
        `${API_BASE_URL}/interactions/comments/${commentId}/votes`,
} as const;

const TOKEN_KEY = "tf_access_token";
const USER_KEY = "tf_user";

export interface StoredUser {
    username: string;
    email: string;
    role: string;
    isSuspended?: boolean;
}

export type AuthActionResponse = {
    message: string;
    token?: string | null;
};

export interface AuthResponse {
    accessToken: string;
    username: string;
    email: string;
    role: string;
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
        return JSON.parse(raw) as StoredUser;
    } catch {
        clearAuth();
        return null;
    }
}

export function getAuthHeader(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function isJsonContentType(contentType: string | null) {
    return contentType?.toLowerCase().includes("application/json") ?? false;
}

async function readErrorMessage(res: Response): Promise<string> {
    const fallback = `Request failed with status ${res.status}`;

    const contentType = res.headers.get("content-type");
    const text = await res.text().catch(() => "");

    if (!text) return fallback;

    if (!isJsonContentType(contentType)) {
        return text;
    }

    try {
        const body = JSON.parse(text);
        return (
            body?.message ||
            body?.error ||
            body?.detail ||
            body?.title ||
            fallback
        );
    } catch {
        return fallback;
    }
}

function handleUnauthorized() {
    clearAuth();

    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("techforum:auth-expired"));
    }
}

export async function apiFetch<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    const token = getToken();
    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const res = await fetch(endpoint, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const message = await readErrorMessage(res);

        if (res.status === 401) {
            handleUnauthorized();
        }

        throw new Error(message);
    }

    const contentType = res.headers.get("content-type");
    if (!isJsonContentType(contentType)) {
        return undefined as T;
    }


    if (res.status === 204) {
        return undefined as T;
    }

    return await res.json() as Promise<T>;
}
