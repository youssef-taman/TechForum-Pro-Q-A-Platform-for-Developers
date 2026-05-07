package com.techforum.backend.domain.comment.mappers;

import com.techforum.backend.domain.comment.Comment;
import com.techforum.backend.domain.comment.dtos.CommentDTO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface CommentMapper {

    @Mapping(source = "parent.id", target = "parentId")
    @Mapping(source = "thread.id", target = "threadId")
    @Mapping(source = "author.id", target = "authorId")
    @Mapping(source = "author.username", target = "authorName")
    CommentDTO toDTO(Comment comment);
}
