package com.techforum.backend.common.exception.user;

public abstract class UserException extends RuntimeException {
  public UserException(String message) {
    super(message);
  }
}
