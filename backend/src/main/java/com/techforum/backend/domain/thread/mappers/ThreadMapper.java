package com.techforum.backend.domain.thread.mappers;

import com.techforum.backend.domain.tag.mappers.TagMapper;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.dtos.ThreadCreateDTO;
import com.techforum.backend.domain.thread.dtos.ThreadDTO;
import com.techforum.backend.domain.thread.dtos.ThreadUpdateDTO;
import org.mapstruct.*;

@Mapper(
    componentModel = "spring",
    uses = {TagMapper.class},
    unmappedTargetPolicy = ReportingPolicy.IGNORE,
    nullValueCheckStrategy = NullValueCheckStrategy.ALWAYS,
    nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
public interface ThreadMapper {

  @Mapping(source = "author.username", target = "authorName")
  ThreadDTO toDTO(Thread thread);

  Thread toEntity(ThreadCreateDTO threadCreateDTO);

  void updateThreadFromDto(ThreadUpdateDTO dto, @MappingTarget Thread thread);
}
