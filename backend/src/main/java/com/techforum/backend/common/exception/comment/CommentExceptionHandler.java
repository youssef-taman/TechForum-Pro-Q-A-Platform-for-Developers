package com.techforum.backend.common.exception.comment;

import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class CommentExceptionHandler {

  @ExceptionHandler(CommentNotFoundException.class)
  public ResponseEntity<Map<String, Object>> handleCommentNotFound(
      CommentNotFoundException exception) {
    Map<String, Object> body = new HashMap<>();
    body.put("message", exception.getMessage());

    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
  }
}
