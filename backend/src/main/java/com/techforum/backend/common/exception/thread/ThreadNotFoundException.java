package com.techforum.backend.common.exception.thread;

public class ThreadNotFoundException extends ThreadException {

  public ThreadNotFoundException() {
    super("The requested thread could not be found.");
  }
}
