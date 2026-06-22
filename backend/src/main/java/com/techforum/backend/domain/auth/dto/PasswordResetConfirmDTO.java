package com.techforum.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmDTO(
    @NotBlank(message = "Reset token is required") String token,
    @NotBlank(message = "New password is required")
        @Size(min = 8, message = "At least 8 characters")
        String newPassword) {}
