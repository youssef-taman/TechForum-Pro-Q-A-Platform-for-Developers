package com.techforum.backend.domain.thread.dtos;

import com.techforum.backend.domain.tag.dtos.TagDTO;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import java.util.Set;

public record ThreadUpdateDTO(String title, String body, ThreadStatus status, Set<TagDTO> tags) {}
