package com.techforum.backend.common.handler;

import com.techforum.backend.common.exception.ConflictException;
import com.techforum.backend.common.exception.InfrastructureException;
import com.techforum.backend.common.response.ApiErrorResponse;
import com.techforum.backend.domain.auth.AuthService;
import com.techforum.backend.domain.auth.SecurityConfig;
import java.util.HashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler for the TechForum API.
 *
 * <p>Centralizes all error responses into a consistent {@link ApiErrorResponse} envelope,
 * preventing raw exception details from leaking to clients and ensuring uniform response shapes
 * across all endpoints.
 *
 * <p>Handler precedence (most specific at least):
 *
 * <ol>
 *   <li>{@link #handleAuthenticationErrors} — 401 for bad credentials
 *   <li>{@link #handleAccessDenied} — 403 for insufficient privileges
 *   <li>{@link #handleConflict} — 409 for duplicate resources
 *   <li>{@link #handleValidationExceptions} — 400 for constraint violations
 *   <li>{@link #handleGenericException} — 500 catch-all
 * </ol>
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  /**
   * Handles authentication failures — wrong password or unknown user.
   *
   * <p><b>Security:</b> Both {@link BadCredentialsException} and {@link UsernameNotFoundException}
   * are mapped to the same generic message intentionally to prevent Username/Email Enumeration
   * attacks.
   *
   * @return {@code 401 Unauthorized} with a generic credential error message.
   */
  @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class, LockedException.class})
  public ResponseEntity<ApiErrorResponse> handleAuthenticationErrors(Exception ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiErrorResponse.builder().status(401).message("Invalid credentials").build());
  }

  /**
   * Handles duplicate resource conflicts during registration.
   *
   * <p>Thrown by {@link AuthService#register} via {@link ConflictException} when the requested
   * username or email is already taken. Uses a typed exception rather than {@link
   * IllegalArgumentException} to avoid over-catching unrelated errors from third-party libraries
   * that also throw {@link IllegalArgumentException}.
   *
   * @return {@code 409 Conflict} with the exception's message as the error detail.
   */
  @ExceptionHandler(ConflictException.class)
  public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(ApiErrorResponse.builder().status(409).message(ex.getMessage()).build());
  }

  /** Catches any database-level unique constraint violations globally. */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(
      DataIntegrityViolationException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(
            ApiErrorResponse.builder()
                .status(409)
                .message("A database conflict occurred. This record might already exist.")
                .build());
  }

  /**
   * Handles {@code @Valid} and {@code @Validated} constraint violations on request bodies.
   *
   * <p>Collects all field-level errors from the binding result into a map of {@code fieldName ->
   * errorMessage} pairs, allowing clients to display inline validation feedback per field rather
   * than a single generic message.
   *
   * @return {@code 400 Bad Request} with a field-error map in the {@code errors} property.
   */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleValidationExceptions(
      MethodArgumentNotValidException ex) {
    Map<String, String> errors = new HashMap<>();
    ex.getBindingResult()
        .getAllErrors()
        .forEach(
            (error) -> {
              String fieldName = ((FieldError) error).getField();
              String errorMessage = error.getDefaultMessage();
              errors.put(fieldName, errorMessage);
            });

    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(
            ApiErrorResponse.builder()
                .status(400)
                .message("Validation failed")
                .errors(errors)
                .build());
  }

  /**
   * Handles malformed JSON and invalid request body formats.
   *
   * <p>Catches cases where:
   * <ul>
   *   <li>Request body contains invalid JSON syntax</li>
   *   <li>Request body is a JSON array instead of an object</li>
   *   <li>Request body is not valid JSON at all (e.g., plain text)</li>
   * </ul>
   *
   * <p>Spring's HttpMessageConverter throws {@link HttpMessageNotReadableException} when it cannot
   * deserialize the request body into the expected DTO class. This is a validation-level error and
   * should return 400 Bad Request, not 500 Internal Server Error.
   *
   * @return {@code 400 Bad Request} with descriptive error message.
   */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiErrorResponse> handleHttpMessageNotReadable(
      HttpMessageNotReadableException ex) {
    String message = "Invalid request body format. Expected a JSON object, not an array or malformed JSON.";

    // Log the underlying cause for debugging
    if (ex.getCause() != null) {
      log.debug("HTTP message not readable. Root cause: {}", ex.getCause().getMessage());
    }

    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiErrorResponse.builder().status(400).message(message).build());
  }

  /**
   * THE CATCH-ALL: Prevents massive Java stack traces from leaking to the frontend if something
   * completely unexpected breaks.
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex) {
    log.error("Unhandled exception caught by GlobalExceptionHandler: {}", ex.getMessage(), ex);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(
            ApiErrorResponse.builder()
                .status(500)
                .message("An unexpected error occurred on the server.")
                .build());
  }

  /**
   * Handles authorization failures for authenticated users with insufficient privileges.
   *
   * <p>Without this handler, Spring Security's {@link AccessDeniedException} propagates to {@link
   * #handleGenericException}, incorrectly returning {@code 500} instead of {@code 403}. See {@link
   * SecurityConfig} for role-based access rules.
   *
   * @return {@code 403 Forbidden} with generic access denied message.
   */
  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(ApiErrorResponse.builder().status(403).message("Access denied").build());
  }

  /**
   * Handles critical infrastructure failures (like Redis outages) so the client doesn't receive a
   * false sense of success.
   */
  @ExceptionHandler(InfrastructureException.class)
  public ResponseEntity<ApiErrorResponse> handleInfrastructureException(
      InfrastructureException ex) {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(ApiErrorResponse.builder().status(503).message(ex.getMessage()).build());
  }
}
