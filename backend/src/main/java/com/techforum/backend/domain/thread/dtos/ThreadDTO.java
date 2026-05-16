package com.techforum.backend.domain.thread.dtos;

import com.techforum.backend.domain.tag.dtos.TagDTO;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record ThreadDTO(
    UUID id,
    String authorName,
    String title,
    String body,
    ThreadStatus status,
    int numberComments,
    Instant createdAt,
    Set<TagDTO> tags) {}
