package com.techforum.backend.domain.thread.dtos;

import java.time.Instant;
import java.util.UUID;

public record DuplicateThreadDTO(
    UUID threadId,
    String authorUsername,
    String title,
    Double cosineSimilarityScore,
    Instant createdAt) {}
