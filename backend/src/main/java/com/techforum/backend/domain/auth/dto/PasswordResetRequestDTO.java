package com.techforum.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record PasswordResetRequestDTO(
    @NotBlank(message = "Username or email is required") String identifier) {}
