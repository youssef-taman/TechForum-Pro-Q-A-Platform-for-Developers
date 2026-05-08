package com.techforum.backend.domain.interaction.dtos;

import com.techforum.backend.domain.interaction.enums.VoteType;
import java.util.UUID;

public record VoteDTO(UUID id, UUID commentId, VoteType type) {}
