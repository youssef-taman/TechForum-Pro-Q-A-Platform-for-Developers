package com.techforum.backend.domain.interaction.dtos;

import java.time.Instant;
import java.util.UUID;

public record BookmarkDTO(
        UUID id,
        UUID threadId,
        String threadTitle,
        Instant createdAt
) {
}
