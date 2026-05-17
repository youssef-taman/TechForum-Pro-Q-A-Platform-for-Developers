package com.techforum.backend.common.exception.thread;

import java.util.UUID;
import lombok.Getter;

public class ThreadNotFoundException extends ThreadException {

  @Getter private final UUID threadId;
  @Getter private final String authorUsername;

  public ThreadNotFoundException(UUID threadId, String authorUsername) {
    super("Thread is not found");
    this.threadId = threadId;
    this.authorUsername = authorUsername;
  }

  public ThreadNotFoundException() {
    super("Thread is not found");
  }
}
