package com.techforum.backend.domain.interaction.mappers;

import com.techforum.backend.domain.interaction.Vote;
import com.techforum.backend.domain.interaction.dtos.VoteDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface VoteMapper {

    @Mapping(source = "comment.id", target = "commentId")
    VoteDTO toDTO (Vote vote);
}
