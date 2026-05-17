package com.techforum.backend.common.exception.thread;

import com.techforum.backend.domain.thread.dtos.DuplicateThreadDTO;
import java.util.Set;
import lombok.Getter;

public class DuplicateThreadException extends ThreadException {

  @Getter private final Set<DuplicateThreadDTO> duplicateThreadDTOSet;

  public DuplicateThreadException(Set<DuplicateThreadDTO> duplicateThreadDTOSet) {
    super("Thread(s) with similar content might be useful.");
    this.duplicateThreadDTOSet = duplicateThreadDTOSet;
  }
}
