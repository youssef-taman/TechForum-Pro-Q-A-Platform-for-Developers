package com.techforum.backend.domain.comment.dtos;

import com.techforum.backend.domain.interaction.enums.VoteType;
import java.time.Instant;
import java.util.UUID;

public record CommentDTO(
    UUID id,
    UUID parentId,
    UUID threadId,
    String authorName,
    String content,
    int replyCount,
    int score,
    Instant createdAt,
    VoteType userVote) {}
