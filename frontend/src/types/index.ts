// ============================================================
// TechForum Pro — Shared TypeScript Types
// Aligned with backend DTOs and enums exactly
// ============================================================

// Matches backend RoleType.java exactly
export type UserRole = "ADMIN" | "MODERATOR" | "USER";

// Matches backend ThreadStatus.java exactly (SOLVED removed, RESOLVED added)
export type ThreadStatus = "OPEN" | "RESOLVED" | "CLOSED";

export type VoteType = "UPVOTE" | "DOWNVOTE";

// Matches backend UserDTO: { id, username, role, isSuspended }
export interface User {
    id: string;
    username: string;
    role: UserRole;
    isSuspended: boolean;
}

// StoredUser saved to localStorage on login (email comes from login response)
export interface StoredUser {
    username: string;
    email: string;
    role: UserRole;
}

export interface Tag {
    id: string;
    name: string;
}

// Matches backend ThreadDTO exactly
export interface Thread {
    id: string;
    authorId: string;
    authorName: string;
    title: string;
    body: string;
    status: ThreadStatus;
    numberComments: number;
    createdAt: string;
    tags: Tag[];
}

// Matches backend CommentDTO exactly
export interface Comment {
    id: string;
    parentId: string | null;
    threadId: string;
    authorId: string;
    authorName: string;
    content: string;
    replyCount: number;
    score: number;
    createdAt: string;
}

// Matches backend BookmarkDTO exactly
export interface Bookmark {
    id: string;
    threadId: string;
    threadTitle: string;
    createdAt: string;
}

// Matches backend VoteDTO exactly
export interface Vote {
    id: string;
    commentId: string;
    type: VoteType;
}

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
}

export interface AuthResponse {
    accessToken: string;
    username: string;
    email: string;
    role: UserRole;
}

export interface LoginCredentials {
    identifier: string;
    password: string;
}

export interface RegisterCredentials {
    username: string;
    email: string;
    password: string;
}
