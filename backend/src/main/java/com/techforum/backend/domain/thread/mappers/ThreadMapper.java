package com.techforum.backend.domain.thread.mappers;

import com.techforum.backend.domain.tag.mappers.TagMapper;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.dtos.*;
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

  @Mapping(target = "tags", ignore = true)
  Thread toEntity(ThreadCreateDTO threadCreateDTO);

  @Mapping(target = "tags", ignore = true)
  void updateThreadFromDto(ThreadUpdateDTO dto, @MappingTarget Thread thread);

  @Mapping(target = "cosineSimilarityScore", source = "similarityScore")
  DuplicateThreadDTO toDuplicateDTO(Thread thread, double similarityScore);

  DuplicateThreadDTO toDuplicateDTO(DuplicateThreadProjection duplicateThreadProjection);
}
