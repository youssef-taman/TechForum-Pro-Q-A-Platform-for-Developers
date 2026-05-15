package com.techforum.backend.domain.thread.dtos;

import com.techforum.backend.domain.tag.Tag;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record ThreadCreateDTO(
    @NotBlank(message = "Title cannot be empty")
        @Size(min = 5, max = 150, message = "Title must be between 5 and 150 characters")
        String title,
    @NotBlank(message = "Body cannot be empty") String body,
    Set<Tag> tags) {}
