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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing authentication endpoints for the TechForum API.
 *
 * <p>All endpoints are publicly accessible (no JWT required) as configured in {@link
 * SecurityConfig}.
 */
@Tag(name = "Authentication", description = "Endpoints for user registration, login, and logout")
@RestController
@RequestMapping(AuthController.AUTH_PATH)
@RequiredArgsConstructor
public class AuthController {

  static final String AUTH_PATH = "/auth";

  private static final String LOGIN_PATH = "/login";
  private static final String REGISTER_PATH = "/register";
  private static final String LOGOUT_PATH = "/logout";

  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_AUTHENTICATION_SCHEME = "Bearer Authentication";

  private static final String LOGIN_SUCCESS_DESCRIPTION = "Login successful";
  private static final String ACCOUNT_CREATED_DESCRIPTION = "Account created successfully";
  private static final String VALIDATION_FAILED_DESCRIPTION = "Validation failed";
  private static final String INVALID_CREDENTIALS_DESCRIPTION = "Invalid credentials";
  private static final String USER_ALREADY_EXISTS_DESCRIPTION =
      "Validation failed or user already exists";
  private static final String TOKEN_REVOKED_DESCRIPTION = "Token revoked or already expired";

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
        @ApiResponse(responseCode = "200", description = LOGIN_SUCCESS_DESCRIPTION),
        @ApiResponse(responseCode = "401", description = INVALID_CREDENTIALS_DESCRIPTION),
        @ApiResponse(responseCode = "400", description = VALIDATION_FAILED_DESCRIPTION)
      })
  @PostMapping(LOGIN_PATH)
  public ResponseEntity<AuthResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
    return ok(authService.login(request));
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
        @ApiResponse(responseCode = "201", description = ACCOUNT_CREATED_DESCRIPTION),
        @ApiResponse(responseCode = "400", description = USER_ALREADY_EXISTS_DESCRIPTION)
      })
  @PostMapping(REGISTER_PATH)
  public ResponseEntity<AuthResponseDTO> register(@Valid @RequestBody RegisterRequestDTO request) {
    return created(authService.register(request));
  }

  /**
   * Invalidates the provided JWT access token by adding it to a Redis blacklist.
   *
   * <p>The token remains in the blacklist until its natural expiration time, after which Redis
   * removes it automatically via TTL. Subsequent requests using the same token will be rejected by
   * {@link JwtAuthFilter}.
   *
   * @param bearerTokenHeader The authorization header containing the access token to revoke.
   * @return 204 No Content on success. Also returns 204 if the token is already expired or invalid
   *     (logout is treated as idempotent).
   */
  @Operation(
      summary = "Logout",
      description = "Revoke a JWT token by blacklisting it in Redis until its natural expiry.",
      responses = {@ApiResponse(responseCode = "204", description = TOKEN_REVOKED_DESCRIPTION)})
  @SecurityRequirement(name = BEARER_AUTHENTICATION_SCHEME)
  @PostMapping(LOGOUT_PATH)
  public ResponseEntity<Void> logout(
      @Parameter(hidden = true) @RequestHeader(AUTHORIZATION_HEADER) String bearerTokenHeader) {
    authService.logout(bearerTokenHeader);
    return noContent();
  }

  private ResponseEntity<AuthResponseDTO> ok(AuthResponseDTO response) {
    return ResponseEntity.ok(response);
  }

  private ResponseEntity<AuthResponseDTO> created(AuthResponseDTO response) {
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  private ResponseEntity<Void> noContent() {
    return ResponseEntity.noContent().build();
  }
}
