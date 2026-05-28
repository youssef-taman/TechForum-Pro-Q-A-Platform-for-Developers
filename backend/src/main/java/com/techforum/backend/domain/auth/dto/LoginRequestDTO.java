package com.techforum.backend.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

/**
 * The login credential identifier — accepts either a username or an email address.
 *
 * <p>Mapped from the JSON key {@code "identifier"} for backwards compatibility with existing
 * clients, but the value may be either a valid email or a plain username.
 */
@Builder
public record LoginRequestDTO(
    @JsonProperty("identifier") @NotBlank(message = IDENTIFIER_REQUIRED_MESSAGE) String identifier,
    @JsonProperty("password")
        @NotBlank(message = PASSWORD_REQUIRED_MESSAGE)
        @Size(min = MIN_PASSWORD_LENGTH, max = MAX_PASSWORD_LENGTH)
        String password) {

  private static final String IDENTIFIER_REQUIRED_MESSAGE = "Username or Email is required";
  private static final String PASSWORD_REQUIRED_MESSAGE = "Password is required";

  private static final int MIN_PASSWORD_LENGTH = 8;
  private static final int MAX_PASSWORD_LENGTH = 255;
}
