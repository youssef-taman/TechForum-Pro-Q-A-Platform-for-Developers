package com.techforum.backend.domain.auth;

import com.techforum.backend.domain.auth.dto.AuthActionResponseDTO;
import com.techforum.backend.domain.auth.dto.AuthResponseDTO;
import com.techforum.backend.domain.auth.dto.ChangePasswordRequestDTO;
import com.techforum.backend.domain.auth.dto.EmailVerificationConfirmDTO;
import com.techforum.backend.domain.auth.dto.EmailVerificationRequestDTO;
import com.techforum.backend.domain.auth.dto.LoginRequestDTO;
import com.techforum.backend.domain.auth.dto.PasswordResetConfirmDTO;
import com.techforum.backend.domain.auth.dto.PasswordResetRequestDTO;
import com.techforum.backend.domain.auth.dto.RegisterRequestDTO;
import com.techforum.backend.domain.auth.filter.JwtAuthFilter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller exposing authentication endpoints for the TechForum API.
 *
 * <p>All endpoints are publicly accessible (no JWT required) as configured in {@link
 * SecurityConfig}, except {@code /logout} and {@code /change-password} which require a valid Bearer
 * token.
 */
@Tag(
    name = "Authentication",
    description =
        "Endpoints for user registration, login, logout, password management, and email verification")
@RestController
@RequestMapping(AuthController.AUTH_PATH)
@RequiredArgsConstructor
public class AuthController {

  static final String AUTH_PATH = "/auth";

  private static final String LOGIN_PATH = "/login";
  private static final String REGISTER_PATH = "/register";
  private static final String LOGOUT_PATH = "/logout";
  private static final String PASSWORD_RESET_REQUEST_PATH = "/password-reset/request";
  private static final String PASSWORD_RESET_CONFIRM_PATH = "/password-reset/confirm";
  private static final String EMAIL_VERIFICATION_REQUEST_PATH = "/email-verification/request";
  private static final String EMAIL_VERIFICATION_CONFIRM_PATH = "/email-verification/confirm";

  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_AUTHENTICATION_SCHEME = "Bearer Authentication";

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
      description =
          "Authenticate with a username or email address and a password. "
              + "Returns a signed JWT access token that must be passed as `Authorization: Bearer <token>` on subsequent requests.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description =
                  "Login credentials. The `identifier` field accepts either a username or an email address.",
              required = true,
              content = @Content(schema = @Schema(implementation = LoginRequestDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Login successful – JWT token returned",
            content = @Content(schema = @Schema(implementation = AuthResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content),
        @ApiResponse(responseCode = "401", description = "Invalid credentials", content = @Content)
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
      description =
          "Create a new user account. "
              + "Validates username and email uniqueness, hashes the password with BCrypt, "
              + "and returns a signed JWT access token. The new account is assigned the `USER` role by default.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Registration details",
              required = true,
              content = @Content(schema = @Schema(implementation = RegisterRequestDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "201",
            description = "Account created – JWT token returned",
            content = @Content(schema = @Schema(implementation = AuthResponseDTO.class))),
        @ApiResponse(
            responseCode = "400",
            description = "Validation failed or username/email already taken",
            content = @Content)
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
      description =
          "Revokes the current JWT by adding it to a Redis blacklist until its natural TTL expires. "
              + "Subsequent requests using the same token are rejected. "
              + "This operation is idempotent – already-expired or invalid tokens still return 204.",
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "Token revoked or already expired",
            content = @Content),
        @ApiResponse(
            responseCode = "401",
            description = "No or malformed Authorization header",
            content = @Content)
      })
  @SecurityRequirement(name = BEARER_AUTHENTICATION_SCHEME)
  @PostMapping(LOGOUT_PATH)
  public ResponseEntity<Void> logout(
      @Parameter(hidden = true) @RequestHeader(AUTHORIZATION_HEADER) String bearerTokenHeader) {
    authService.logout(bearerTokenHeader);
    return noContent();
  }

  @Operation(
      summary = "Request password reset",
      description =
          "Generates a time-limited password reset token for the account associated with the provided email "
              + "and sends it via email. Always returns 200 to prevent user enumeration.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Email address of the account",
              required = true,
              content = @Content(schema = @Schema(implementation = PasswordResetRequestDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Reset email dispatched (or silently skipped if address not found)",
            content = @Content(schema = @Schema(implementation = AuthActionResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content)
      })
  @PostMapping(PASSWORD_RESET_REQUEST_PATH)
  public ResponseEntity<AuthActionResponseDTO> requestPasswordReset(
      @Valid @RequestBody PasswordResetRequestDTO request) {
    return ok(authService.requestPasswordReset(request));
  }

  @Operation(
      summary = "Confirm password reset",
      description =
          "Validates the password reset token and replaces the account password with the new one. "
              + "Tokens are single-use and expire after a fixed window.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Reset token and new password",
              required = true,
              content = @Content(schema = @Schema(implementation = PasswordResetConfirmDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Password reset successfully",
            content = @Content(schema = @Schema(implementation = AuthActionResponseDTO.class))),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid or expired token, or validation failed",
            content = @Content)
      })
  @PostMapping(PASSWORD_RESET_CONFIRM_PATH)
  public ResponseEntity<AuthActionResponseDTO> confirmPasswordReset(
      @Valid @RequestBody PasswordResetConfirmDTO request) {
    return ok(authService.confirmPasswordReset(request));
  }

  @Operation(
      summary = "Change password",
      description =
          "Allows an authenticated user to update their password by supplying their current password "
              + "alongside the new one. Requires a valid Bearer token.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Current password and new password",
              required = true,
              content =
                  @Content(schema = @Schema(implementation = ChangePasswordRequestDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Password changed successfully",
            content = @Content),
        @ApiResponse(
            responseCode = "400",
            description = "Validation failed or current password incorrect",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
      })
  @SecurityRequirement(name = BEARER_AUTHENTICATION_SCHEME)
  @PostMapping("/change-password")
  public ResponseEntity<Void> changePassword(
      @Valid @RequestBody ChangePasswordRequestDTO request, Authentication authentication) {
    authService.changePassword(request, authentication);
    return ResponseEntity.ok().build();
  }

  @Operation(
      summary = "Request email verification",
      description =
          "Generates and emails a time-limited verification token for the account associated with the provided email. "
              + "Always returns 200 to prevent address enumeration.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Email address to verify",
              required = true,
              content =
                  @Content(schema = @Schema(implementation = EmailVerificationRequestDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description =
                "Verification email dispatched (or silently skipped if address not found)",
            content = @Content(schema = @Schema(implementation = AuthActionResponseDTO.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content)
      })
  @PostMapping(EMAIL_VERIFICATION_REQUEST_PATH)
  public ResponseEntity<AuthActionResponseDTO> requestEmailVerification(
      @Valid @RequestBody EmailVerificationRequestDTO request) {
    return ok(authService.requestEmailVerification(request));
  }

  @Operation(
      summary = "Confirm email verification",
      description =
          "Validates the email verification token and marks the account's email address as verified. "
              + "Tokens are single-use and expire after a fixed window.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Verification token",
              required = true,
              content =
                  @Content(schema = @Schema(implementation = EmailVerificationConfirmDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Email verified successfully",
            content = @Content(schema = @Schema(implementation = AuthActionResponseDTO.class))),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid or expired token",
            content = @Content)
      })
  @PostMapping(EMAIL_VERIFICATION_CONFIRM_PATH)
  public ResponseEntity<AuthActionResponseDTO> confirmEmailVerification(
      @Valid @RequestBody EmailVerificationConfirmDTO request) {
    return ok(authService.confirmEmailVerification(request));
  }

  private <T> ResponseEntity<T> ok(T response) {
    return ResponseEntity.ok(response);
  }

  private <T> ResponseEntity<T> created(T response) {
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
  }

  private ResponseEntity<Void> noContent() {
    return ResponseEntity.noContent().build();
  }
}
