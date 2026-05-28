package com.techforum.backend.domain.comment.dtos;

import java.util.UUID;

public record AddCommentDTO(UUID parentId, UUID threadId, String content) {}
