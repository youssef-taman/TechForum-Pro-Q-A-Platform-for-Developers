package com.techforum.backend.domain.auth;

import com.techforum.backend.domain.auth.dto.AuthResponseDTO;
import com.techforum.backend.domain.auth.dto.LoginRequestDTO;
import com.techforum.backend.domain.auth.dto.RegisterRequestDTO;
import com.techforum.backend.domain.auth.filter.JwtAuthFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller exposing authentication endpoints for the TechForum API.
 *
 * <p>All endpoints are publicly accessible (no JWT required) as configured in {@link
 * SecurityConfig}.
 */
@Tag(name = "Authentication", description = "Endpoints for user registration, login, and logout")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

  private final AuthService authService;

  /**
   * Authenticates an existing user and returns a signed JWT access token.
   *
   * <p>The {@code identifier} field accepts either a username or an email address.
   *
   * @param request The login credentials.
   * @return 200 OK with {@link AuthResponseDTO} containing the access token and user info.
   */
  @Operation(
      summary = "Login",
      description = "Authenticate with username/email and password. Returns a JWT access token.",
      responses = {
        @ApiResponse(responseCode = "200", description = "Login successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "400", description = "Validation failed")
      })
  @PostMapping("/login")
  public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
    return ResponseEntity.ok(authService.login(request));
  }

  /**
   * Registers a new user account and returns a signed JWT access token.
   *
   * <p>Username and email uniqueness are validated before persisting. Passwords are stored using
   * BCrypt hashing. The new account is assigned the {@code USER} role by default.
   *
   * @param request The registration details (username, email, password).
   * @return 201 Created with {@link AuthResponseDTO} containing the access token and user info.
   * @throws IllegalArgumentException if the username or email is already taken.
   */
  @Operation(
      summary = "Register",
      description = "Create a new user account. Returns a JWT access token on success.",
      responses = {
        @ApiResponse(responseCode = "201", description = "Account created successfully"),
        @ApiResponse(responseCode = "400", description = "Validation failed or user already exists")
      })
  @PostMapping("/register")
  public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
  }

  /**
   * Invalidates the provided JWT access token by adding it to a Redis blacklist.
   *
   * <p>The token remains in the blacklist until its natural expiration time, after which Redis
   * removes it automatically via TTL. Subsequent requests using the same token will be rejected by
   * {@link JwtAuthFilter}.
   *
   * @param authorizationHeader The logout header containing the access token to revoke.
   * @return 204 No Content on success. Also returns 204 if the token is already expired or invalid
   *     (logout is treated as idempotent).
   */
  @Operation(
      summary = "Logout",
      description = "Revoke a JWT token by blacklisting it in Redis until its natural expiry.",
      responses = {
        @ApiResponse(responseCode = "204", description = "Token revoked or already expired")
      })
  @SecurityRequirement(name = "Bearer Authentication")
  @PostMapping("/logout")
  public ResponseEntity<Void> logout(@Parameter(hidden = true) @RequestHeader("Authorization") String authorizationHeader) {
    authService.logout(authorizationHeader);
    return ResponseEntity.noContent().build();
  }
}
