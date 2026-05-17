package com.techforum.backend.domain.tag.mappers;

import com.techforum.backend.domain.tag.Tag;
import com.techforum.backend.domain.tag.dtos.TagDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface TagMapper {

  TagDTO toDTO(Tag tag);

  Tag toEntity(TagDTO tagDTO);
}
