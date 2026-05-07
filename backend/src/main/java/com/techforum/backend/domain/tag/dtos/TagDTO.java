package com.techforum.backend.domain.tag.dtos;

import java.util.UUID;

public record TagDTO(
        UUID id,
        String name
) {
}
