package com.techforum.backend.domain.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequestDTO {
  @Email
  @NotBlank
  @Size(max = 255)
  @JsonProperty("email")
  private String email;

  @NotBlank
  @Size(min = 8, max = 255)
  @JsonProperty("password")
  private String password;

  @NotBlank
  @Size(min = 8, max = 30)
  @JsonProperty("username")
  private String username;
}
