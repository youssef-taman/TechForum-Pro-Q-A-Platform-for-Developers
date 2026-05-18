package com.techforum.backend.domain.comment;

import com.techforum.backend.common.exception.comment.CommentNotFoundException;
import com.techforum.backend.common.exception.thread.ThreadNotFoundException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.comment.dtos.AddCommentDTO;
import com.techforum.backend.domain.comment.dtos.CommentDTO;
import com.techforum.backend.domain.comment.mappers.CommentMapper;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.ThreadRepository;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CommentService {

  private final CommentRepository commentRepository;
  private final UserRepository userRepository;
  private final ThreadRepository threadRepository;
  private final CommentMapper commentMapper;

  @Transactional
  public CommentDTO addComment(@Valid AddCommentDTO addCommentDTO, Authentication authentication) {

    String username = authentication.getName();
    User user =
        userRepository
            .findByIdentifier(username)
            .orElseThrow(() -> new UserNotFoundException(username));

    Thread thread =
        threadRepository
            .findById(addCommentDTO.threadId())
            .orElseThrow(() -> new ThreadNotFoundException(addCommentDTO.threadId(), username));

    Comment parent =
        addCommentDTO.parentId() == null
            ? null
            : commentRepository
                .findById(addCommentDTO.parentId())
                .orElseThrow(CommentNotFoundException::new);

    Comment comment =
        Comment.builder()
            .author(user)
            .thread(thread)
            .parent(parent)
            .content(addCommentDTO.content())
            .score(0)
            .replyCount(0)
            .build();
    commentRepository.save(comment);
    return commentMapper.toDTO(comment);
  }

  @Transactional
  public void deleteComment(UUID commentId, Authentication authentication) {

    String username = authentication.getName();

    User user =
        userRepository
            .findByIdentifier(username)
            .orElseThrow(() -> new UserNotFoundException(username));

    Comment comment =
        commentRepository.findById(commentId).orElseThrow(CommentNotFoundException::new);

    boolean isAdminOrMod =
        authentication.getAuthorities().stream()
            .anyMatch(
                a ->
                    a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_MODERATOR"));

    if (!isAdminOrMod && !comment.getAuthor().getUsername().equals(username)) {
      throw new AccessDeniedException("You don't have permission to delete this comment!");
    }

    commentRepository.delete(comment);
  }

  @Transactional
  public CommentDTO updateComment(
      UUID commentId, @Valid String updatedContent, Authentication authentication) {

    String username = authentication.getName();

    User user =
        userRepository
            .findByIdentifier(username)
            .orElseThrow(() -> new UserNotFoundException(username));

    Comment comment =
        commentRepository.findById(commentId).orElseThrow(CommentNotFoundException::new);

    if (!comment.getAuthor().getUsername().equals(username)) {
      throw new AccessDeniedException("You don't have permission to edit this comment!");
    }

    comment.setContent(updatedContent);
    commentRepository.save(comment);

    return commentMapper.toDTO(comment);
  }

  @Transactional(readOnly = true)
  public Page<CommentDTO> getThreadComments(UUID threadId, int page, int size, String sortBy) {

    Thread thread =
        threadRepository
            .findById(threadId)
            .orElseThrow(() -> new ThreadNotFoundException(threadId, "Wrong Author"));

    Sort sort =
        switch (sortBy) {
          case "top score" -> Sort.by("score").descending();
          case "top interaction" -> Sort.by("replyCount").descending();
          case "older" -> Sort.by("createdAt").ascending();
          default -> Sort.by("createdAt").descending();
        };

    Pageable pageable = PageRequest.of(page, size, sort);
    Page<Comment> commentPage =
        commentRepository.findByThread_IdAndParentIsNull(threadId, pageable);
    return commentPage.map(commentMapper::toDTO);
  }
}
