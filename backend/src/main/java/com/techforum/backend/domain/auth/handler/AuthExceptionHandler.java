package com.techforum.backend.domain.auth.handler;

import com.techforum.backend.common.exception.response.ApiErrorResponse;
import io.jsonwebtoken.JwtException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Global exception handler for the TechForum API.
 *
 * <p>Centralizes all error responses into a consistent {@link ApiErrorResponse} envelope,
 * preventing raw exception details from leaking to clients and ensuring uniform response shapes
 * across all endpoints.
 */
@Slf4j
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthExceptionHandler {

  /** Handles authentication failures — wrong password or unknown user. */
  @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
  public ResponseEntity<ApiErrorResponse> handleAuthenticationErrors(Exception ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiErrorResponse.builder().status(401).message("Invalid credentials").build());
  }

  /**
   * Handles JWT parsing/validation errors if they are thrown inside a controller layer. (Note: If
   * thrown inside JwtAuthFilter, Spring Security handles it before reaching here).
   */
  @ExceptionHandler(JwtException.class)
  public ResponseEntity<ApiErrorResponse> handleJwtExceptions(JwtException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiErrorResponse.builder().status(401).message("Invalid or expired token").build());
  }

  /**
   * Handles requests where a valid user tries to access an endpoint they don't have the @Role for
   * (e.g., a standard USER trying to hit an ADMIN endpoint).
   */
  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiErrorResponse> handleAccessDeniedException(AccessDeniedException ex) {
    return ResponseEntity.status(HttpStatus.FORBIDDEN)
        .body(
            ApiErrorResponse.builder()
                .status(403)
                .message("You do not have permission to access this resource")
                .build());
  }

  @ExceptionHandler(LockedException.class)
  public ResponseEntity<ApiErrorResponse> handleLockedException(LockedException ex) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(ApiErrorResponse.builder().status(401).message("Account suspended").build());
  }
}
