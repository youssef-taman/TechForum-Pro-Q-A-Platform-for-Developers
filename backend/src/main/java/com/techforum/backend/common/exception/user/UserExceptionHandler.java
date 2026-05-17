package com.techforum.backend.common.exception.user;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class UserExceptionHandler {

  @ExceptionHandler(UserNotFoundException.class)
  public ResponseEntity<Map<String, Object>> handleNotFoundUser(UserNotFoundException exception) {
    Map<String, Object> body = new HashMap<>();
    body.put("message", exception.getMessage());
    body.put("status", HttpStatus.NOT_FOUND.value());
    body.put("error", "Not Found");
    body.put("username", exception.getUsername());

    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
  }
}
