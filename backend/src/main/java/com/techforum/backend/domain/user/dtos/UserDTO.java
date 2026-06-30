package com.techforum.backend.domain.user.dtos;

import com.techforum.backend.domain.user.enums.RoleType;
import java.util.UUID;

public record UserDTO(UUID id, String username, String email, RoleType role, boolean isSuspended) {}
