package com.techforum.backend.domain.interaction.mappers;

import com.techforum.backend.domain.interaction.Bookmark;
import com.techforum.backend.domain.interaction.dtos.BookmarkDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface BookmarkMapper {

    @Mapping(source = "thread.title", target = "threadTitle")
    @Mapping(source = "thread.id", target = "threadId")
    BookmarkDTO toDto(Bookmark bookmark);
}
