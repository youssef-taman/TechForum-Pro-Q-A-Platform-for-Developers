package com.techforum.backend.domain.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record EmailVerificationConfirmDTO(
    @NotBlank(message = "Verification token is required") String token) {}
