package com.techforum.backend.domain.thread.mappers;

import com.techforum.backend.domain.tag.mappers.TagMapper;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.dtos.ThreadDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring", uses = {TagMapper.class})
public interface ThreadMapper {

    @Mapping(source = "author.id", target = "authorId")
    @Mapping(source = "author.username", target = "authorName")
    ThreadDTO toDTO(Thread thread);
}
