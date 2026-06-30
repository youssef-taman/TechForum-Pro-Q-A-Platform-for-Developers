package com.techforum.backend.domain.comment.mappers;

import com.techforum.backend.domain.comment.Comment;
import com.techforum.backend.domain.comment.dtos.CommentDTO;
import com.techforum.backend.domain.interaction.enums.VoteType;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommentMapper {

  @Mapping(source = "parent.id", target = "parentId")
  @Mapping(source = "thread.id", target = "threadId")
  @Mapping(source = "author.username", target = "authorName")
  @Mapping(target = "userVote", ignore = true)
  CommentDTO toDTO(Comment comment);

  default CommentDTO toDTO(Comment comment, VoteType userVote) {
    CommentDTO dto = toDTO(comment);
    return new CommentDTO(
        dto.id(),
        dto.parentId(),
        dto.threadId(),
        dto.authorName(),
        dto.content(),
        dto.replyCount(),
        dto.score(),
        dto.createdAt(),
        userVote);
  }
}
