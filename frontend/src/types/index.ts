// ============================================================
// TechForum Pro — Shared TypeScript Types
// ============================================================

export type UserRole = "guest" | "member" | "moderator" | "admin";
export type ThreadStatus = "open" | "solved" | "closed";

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  reputation: number;
  role: UserRole;
  status?: "active" | "suspended";
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  count?: number;
}

export interface Thread {
  id: string;
  title: string;
  body: string;
  author: User;
  tags: string[];
  upvotes: number;
  downvotes: number;
  commentCount: number;
  status: ThreadStatus;
  acceptedAnswerId?: string | null;
  aiTaggingStatus?: "pending" | "ready" | "failed";
  flagged?: boolean;
  duplicateOf?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  threadId: string;
  author: User;
  body: string;
  upvotes: number;
  isAiGenerated: boolean;
  createdAt: string;
  comments: Comment[];
}

export interface Comment {
  id: string;
  body: string;
  author: User;
  isAiGenerated: boolean;
  createdAt: string;
}

export interface DuplicateMatch {
  threadId: string;
  title: string;
  similarity: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export type SortOption = "newest" | "oldest" | "most_votes" | "unanswered" | "solved";
