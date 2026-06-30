// TechForum Pro — Shared TypeScript Types
// Aligned exactly with backend DTOs

export type UserRole = "ADMIN" | "MODERATOR" | "USER";
export type ThreadStatus = "OPEN" | "RESOLVED" | "CLOSED" | "PENDING";
export type VoteType = "UPVOTE" | "DOWNVOTE";

export interface User {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    isSuspended: boolean;
}

export interface StoredUser {
    username: string;
    email: string;
    role: UserRole;
}

// TagDTO from backend only has `name` (no id) — use name as key
export interface Tag {
    name: string;
}

export interface Thread {
    id: string;
    authorName: string; // backend field; authorId does not exist in DTO
    title: string;
    body: string;
    status: ThreadStatus;
    numberComments: number;
    createdAt: string;
    tags: Tag[];
}

export interface Comment {
    id: string;
    parentId: string | null;
    threadId: string;
    authorName: string; // backend field; authorId does not exist in DTO
    content: string;
    replyCount: number;
    totalReplies?: number;
    score: number;
    createdAt: string;
    userVote?: VoteType | null;
}

export interface Bookmark {
    id: string;
    threadId: string;
    threadTitle: string;
    createdAt: string;
}

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
