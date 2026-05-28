package com.techforum.backend.common.exception.thread;

import com.techforum.backend.domain.thread.dtos.DuplicateThreadDTO;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.Getter;

public class DuplicateThreadException extends ThreadException {

  @Getter private final List<DuplicateThreadDTO> duplicateThreadDTOList;
  @Getter private final Set<DuplicateThreadDTO> duplicateThreadDTOSet;

  public DuplicateThreadException(List<DuplicateThreadDTO> duplicateThreadDTOList) {
    super("Thread(s) with similar content might be useful.");
    this.duplicateThreadDTOList = duplicateThreadDTOList;
    this.duplicateThreadDTOSet = new HashSet<>();
  }

  public DuplicateThreadException(Set<DuplicateThreadDTO> duplicateThreadDTOSet) {
    super("Thread(s) with similar content might be useful.");
    this.duplicateThreadDTOSet = duplicateThreadDTOSet;
    this.duplicateThreadDTOList = new ArrayList<>();
  }
}
