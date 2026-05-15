package com.techforum.backend.domain.thread.dtos;

import java.util.UUID;

public record DuplicateThreadDTO(
    UUID threadId, String authorUsername, Double cosineSimilarityScore) {}
