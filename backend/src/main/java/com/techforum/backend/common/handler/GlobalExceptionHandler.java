package com.techforum.backend.common.handler;

import com.techforum.backend.common.exception.InfrastructureException;
import com.techforum.backend.common.response.ApiErrorResponse;
import java.util.HashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  /** Handles custom infrastructure failures (e.g., Redis timeouts). */
  @ExceptionHandler(InfrastructureException.class)
  public ResponseEntity<Map<String, String>> handleInfrastructureException(
      InfrastructureException ex) {
    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
        .body(Map.of("error", ex.getMessage()));
  }

  /**
   * Handles @Valid / @NotBlank validation failures from Request DTOs. Returns a map of the specific
   * fields that failed validation.
   */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> handleValidationExceptions(
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
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
  }

  /**
   * Handles database unique constraint violations (e.g., duplicate emails during registration) that
   * weren't caught by the application logic.
   */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolationException(
      DataIntegrityViolationException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(
            ApiErrorResponse.builder()
                .status(409)
                .message("A resource with that identifier already exists.")
                .build());
  }

  /**
   * The Ultimate Fallback: Catches any exception not explicitly handled above. Prevents standard
   * Tomcat HTML error pages from leaking to your JSON API.
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex) {
    // Note: In production, log the actual 'ex.getMessage()' here for debugging,
    // but only return a generic message to the client for security.
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(
            ApiErrorResponse.builder()
                .status(500)
                .message("An unexpected internal server error occurred.")
                .build());
  }
}
