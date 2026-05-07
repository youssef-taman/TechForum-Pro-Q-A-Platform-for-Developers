package com.techforum.backend.domain.auth.dto;

import lombok.Builder;

@Builder
public record AuthResponseDTO(String accessToken, String username, String email, String role) {}
