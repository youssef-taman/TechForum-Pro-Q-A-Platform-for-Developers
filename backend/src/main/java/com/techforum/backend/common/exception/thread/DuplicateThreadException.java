package com.techforum.backend.common.exception.thread;

import java.util.UUID;
import lombok.Getter;

public class DuplicateThreadException extends ThreadException {

  @Getter private final UUID existingThreadId;
  @Getter private final String userIdentifier;
  @Getter private final double cosineSimilarityScore;

  public DuplicateThreadException(
      UUID existingThreadId, String userIdentifier, double cosineSimilarityScore) {
    super("A thread with similar content already exists.");
    this.existingThreadId = existingThreadId;
    this.userIdentifier = userIdentifier;
    this.cosineSimilarityScore = cosineSimilarityScore;
  }
}
