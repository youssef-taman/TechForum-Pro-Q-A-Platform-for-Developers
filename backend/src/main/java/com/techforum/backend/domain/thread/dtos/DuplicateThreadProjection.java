package com.techforum.backend.domain.thread.dtos;

import java.time.Instant;
import java.util.UUID;

public interface DuplicateThreadProjection {

  UUID getThreadId();

  String getAuthorUsername();

  String getTitle();

  Double getCosineSimilarityScore();

  Instant getCreatedAt();
}
