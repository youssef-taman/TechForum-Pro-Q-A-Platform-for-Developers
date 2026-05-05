package com.techforum.backend.domain.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class AuthResponseDTO {
  private String accessToken;
  private String username;
  private String email;
  private String role;
}
