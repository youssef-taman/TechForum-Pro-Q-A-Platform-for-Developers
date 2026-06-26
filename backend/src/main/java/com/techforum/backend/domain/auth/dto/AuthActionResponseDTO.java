package com.techforum.backend.domain.auth.dto;

import lombok.Builder;

@Builder
public record AuthActionResponseDTO(String message, String token) {}
