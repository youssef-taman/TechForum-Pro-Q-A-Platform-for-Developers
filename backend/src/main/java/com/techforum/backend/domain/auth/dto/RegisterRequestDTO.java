package com.techforum.backend.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;

@Builder
public record RegisterRequestDTO(
    @JsonProperty("email")
        @Email(message = EMAIL_INVALID_MESSAGE)
        @NotBlank(message = EMAIL_REQUIRED_MESSAGE)
        @Size(max = MAX_EMAIL_LENGTH)
        String email,
    @JsonProperty("password")
        @NotBlank(message = PASSWORD_REQUIRED_MESSAGE)
        @Size(min = MIN_PASSWORD_LENGTH, max = MAX_PASSWORD_LENGTH)
        String password,
    @JsonProperty("username")
        @NotBlank(message = USERNAME_REQUIRED_MESSAGE)
        @Size(min = MIN_USERNAME_LENGTH, max = MAX_USERNAME_LENGTH)
        String username) {

  private static final String EMAIL_INVALID_MESSAGE = "Email must be valid";
  private static final String EMAIL_REQUIRED_MESSAGE = "Email is required";
  private static final String PASSWORD_REQUIRED_MESSAGE = "Password is required";
  private static final String USERNAME_REQUIRED_MESSAGE = "Username is required";

  private static final int MAX_EMAIL_LENGTH = 255;
  private static final int MIN_PASSWORD_LENGTH = 8;
  private static final int MAX_PASSWORD_LENGTH = 255;
  private static final int MIN_USERNAME_LENGTH = 3;
  private static final int MAX_USERNAME_LENGTH = 30;
}
