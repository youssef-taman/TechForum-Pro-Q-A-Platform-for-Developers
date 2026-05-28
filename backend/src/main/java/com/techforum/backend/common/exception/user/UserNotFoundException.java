package com.techforum.backend.common.exception.user;

import lombok.Getter;

public class UserNotFoundException extends UserException {

  @Getter private final String username;

  public UserNotFoundException(String username) {
    super("Current user not found.");
    this.username = username;
  }

  public UserNotFoundException() {
    super("Current user not found.");
    this.username = "Unknown";
  }
}
