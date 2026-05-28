package com.techforum.backend.domain.thread.dtos;

import com.techforum.backend.domain.thread.enums.ThreadStatus;
import java.time.Instant;
import java.util.Set;
import org.springframework.format.annotation.DateTimeFormat;

public record ThreadSearchDTO(
    String keyword,
    Integer page,
    Integer size,
    String sortBy,
    ThreadStatus status,
    Set<String> tags,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
    String author,
    Integer minCommentsNumber,
    Integer maxCommentsNumber,
    Boolean semanticAiSearch) {

  public ThreadSearchDTO {
    if (page == null) page = 0;
    if (size == null) size = 10;
    if (sortBy == null || sortBy.isBlank()) sortBy = "latest";
    if (semanticAiSearch == null) semanticAiSearch = false;
  }
}
