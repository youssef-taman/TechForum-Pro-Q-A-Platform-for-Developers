package com.techforum.backend.common.exception.thread;

public abstract class ThreadException extends RuntimeException {
  public ThreadException(String message) {
    super(message);
  }
}
