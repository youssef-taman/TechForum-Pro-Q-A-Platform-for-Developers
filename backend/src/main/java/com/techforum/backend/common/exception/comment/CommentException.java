package com.techforum.backend.common.exception.comment;

public abstract class CommentException extends RuntimeException {
  public CommentException(String message) {
    super(message);
  }
}
