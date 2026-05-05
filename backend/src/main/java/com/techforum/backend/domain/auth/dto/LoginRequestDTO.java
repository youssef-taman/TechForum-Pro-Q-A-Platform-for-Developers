package com.techforum.backend.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * The login credential identifier — accepts either a username or an email address.
 *
 * <p>Mapped from the JSON key {@code "identifier"} for backwards compatibility with existing clients,
 * but the value may be either a valid email or a plain username.
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequestDTO {
  @JsonProperty("identifier")
  @NotBlank(message = "Username or Email is required")
  private String identifier;

  @Size(min = 8, max = 255)
  @JsonProperty("password")
  @NotBlank(message = "Password is required")
  private String password;
}
