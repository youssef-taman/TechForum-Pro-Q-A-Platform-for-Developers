package com.techforum.backend.common.exception.thread;

import com.techforum.backend.domain.thread.dtos.DuplicateThreadDTO;
import java.util.List;
import lombok.Getter;

public class DuplicateThreadException extends ThreadException {

  @Getter private final List<DuplicateThreadDTO> duplicateThreadDTOSet;

  public DuplicateThreadException(List<DuplicateThreadDTO> duplicateThreadDTOSet) {
    super("Thread(s) with similar content might be useful.");
    this.duplicateThreadDTOSet = duplicateThreadDTOSet;
  }
}
