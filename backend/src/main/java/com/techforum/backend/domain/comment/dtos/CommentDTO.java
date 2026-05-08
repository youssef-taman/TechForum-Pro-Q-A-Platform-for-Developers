package com.techforum.backend.domain.comment.dtos;

import java.time.Instant;
import java.util.UUID;

public record CommentDTO(
    UUID id,
    UUID parentId,
    UUID threadId,
    UUID authorId,
    String authorName,
    String content,
    int replyCount,
    int score,
    Instant createdAt) {}
