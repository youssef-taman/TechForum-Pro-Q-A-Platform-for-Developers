package com.techforum.backend.common.exception.comment;

public class CommentNotFoundException extends CommentException {
  public CommentNotFoundException() {
    super("The requested comment could not be found.");
  }
}
