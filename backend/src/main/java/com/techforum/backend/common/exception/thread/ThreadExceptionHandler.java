package com.techforum.backend.common.exception.thread;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ThreadExceptionHandler {

  @ExceptionHandler(DuplicateThreadException.class)
  public ResponseEntity<Map<String, Object>> handleDuplicateThread(
      DuplicateThreadException exception) {
    Map<String, Object> body = new HashMap<>();
    body.put("message", exception.getMessage());
    body.put("duplicate threads", exception.getDuplicateThreadDTOSet());

    return ResponseEntity.status(HttpStatus.CONFLICT).body(body);
  }

  @ExceptionHandler(ThreadNotFoundException.class)
  public ResponseEntity<Map<String, Object>> handleThreadNotFound(
      ThreadNotFoundException exception) {
    Map<String, Object> body = new HashMap<>();
    body.put("message", exception.getMessage());

    if (exception.getThreadId() != null) {
      body.put("threadId", exception.getThreadId());
    }

    if (exception.getAuthorUsername != null) {
      body.put("author", exception.getAuthorUsername());
    }

    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
  }
}
