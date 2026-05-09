package com.techforum.backend.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(String message, List<FieldError> errors) {
  public record FieldError(String field, String message) {}
}
