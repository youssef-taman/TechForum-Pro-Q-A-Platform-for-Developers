package com.techforum.backend.domain.thread.mappers;

import com.techforum.backend.domain.tag.mappers.TagMapper;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.dtos.ThreadCreateDTO;
import com.techforum.backend.domain.thread.dtos.ThreadDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

@Mapper(
    componentModel = "spring",
    uses = {TagMapper.class},
    unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface ThreadMapper {

  @Mapping(source = "author.id", target = "authorId")
  @Mapping(source = "author.username", target = "authorName")
  ThreadDTO toDTO(Thread thread);

  Thread toEntity(ThreadCreateDTO threadCreateDTO);
}
