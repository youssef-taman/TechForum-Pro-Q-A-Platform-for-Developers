package com.techforum.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailVerificationRequestDTO(
    @NotBlank(message = "Username or email is required") String identifier) {}
