package com.techforum.backend.common.exception.user;

public class UserNotFoundException extends UserException {
  public UserNotFoundException() {
    super("Current user not found.");
  }
}
