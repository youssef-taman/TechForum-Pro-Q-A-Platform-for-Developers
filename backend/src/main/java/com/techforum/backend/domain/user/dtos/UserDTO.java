package com.techforum.backend.domain.user.dtos;

import com.techforum.backend.domain.user.enums.RoleType;

import java.util.UUID;

public record UserDTO(
        UUID id,
        String username,
        RoleType role,
        boolean isSuspended
) {
}
