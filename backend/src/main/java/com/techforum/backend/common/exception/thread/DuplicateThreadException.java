package com.techforum.backend.common.exception.thread;

import com.techforum.backend.domain.thread.dtos.DuplicateThreadDTO;
import java.util.*;
import lombok.Getter;

public class DuplicateThreadException extends ThreadException {

  @Getter private final Collection<DuplicateThreadDTO> duplicateThreadDTOList;

  public DuplicateThreadException(Collection<DuplicateThreadDTO> duplicateThreadDTOList) {
    super("Thread(s) with similar content might be useful.");
    this.duplicateThreadDTOList = duplicateThreadDTOList;
  }
}
