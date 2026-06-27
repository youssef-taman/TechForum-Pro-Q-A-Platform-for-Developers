package com.techforum.backend.domain.comment;

import com.techforum.backend.common.exception.comment.CommentNotFoundException;
import com.techforum.backend.common.exception.thread.ThreadNotFoundException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.comment.dtos.AddCommentDTO;
import com.techforum.backend.domain.comment.dtos.CommentDTO;
import com.techforum.backend.domain.comment.mappers.CommentMapper;
import com.techforum.backend.domain.interaction.Vote;
import com.techforum.backend.domain.interaction.VoteRepository;
import com.techforum.backend.domain.interaction.enums.VoteType;
import com.techforum.backend.domain.notification.NotificationController;
import com.techforum.backend.domain.notification.NotificationService;
import com.techforum.backend.domain.notification.dtos.NotificationDTO;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.ThreadRepository;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
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
  private final NotificationController notificationController;
  private final NotificationService notificationService;
  private final CommentRepository commentRepository;
  private final UserRepository userRepository;
  private final ThreadRepository threadRepository;
  private final CommentMapper commentMapper;
  private final VoteRepository voteRepository;

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

    Comment currentAncestor = parent;
    while (currentAncestor != null) {
      commentRepository.incrementReplyCount(currentAncestor.getId());
      currentAncestor = currentAncestor.getParent();
    }

    Comment comment =
        Comment.builder()
            .author(user)
            .thread(thread)
            .parent(parent)
            .content(addCommentDTO.content())
            .score(0)
            .replyCount(0)
            .createdAt(Instant.now())
            .build();
    commentRepository.save(comment);

    // 1. Get the parent comment author (if it's a reply)
    if (addCommentDTO.parentId() != null) {
      Comment parentComment =
          commentRepository
              .findById(addCommentDTO.parentId())
              .orElseThrow(CommentNotFoundException::new);

      String authorName = authentication.getName();

      // Don't notify if replying to yourself
      if (!parentComment.getAuthor().getUsername().equals(authorName)) {
        String message = "@" + authorName + " replied to your comment.";
        String link = "/questions/" + addCommentDTO.threadId();

        // Create AND push to SSE via the controller
        NotificationDTO dto =
            notificationService.createNotification(
                parentComment.getAuthor().getUsername(), "REPLY", message, link);
        notificationController.sendNotificationToUser(parentComment.getAuthor().getUsername(), dto);
      }
    } else {
      // Optional: Notify thread author that they got a new top-level comment
      Thread targetThread = threadRepository.findById(addCommentDTO.threadId()).orElseThrow();
      String authorName = authentication.getName();
      if (!targetThread.getAuthor().getUsername().equals(authorName)) {
        String message =
            "@"
                + authorName
                + " commented on your thread: "
                + targetThread
                    .getTitle()
                    .substring(0, Math.min(targetThread.getTitle().length(), 30))
                + "...";
        String link =
            "/questions/"
                + (comment.getThread() != null ? comment.getThread().getId() : "unknown-thread");

        NotificationDTO dto =
            notificationService.createNotification(
                targetThread.getAuthor().getUsername(), "COMMENT", message, link);
        notificationController.sendNotificationToUser(targetThread.getAuthor().getUsername(), dto);
      }
    }
    return commentMapper.toDTO(comment, null);
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

    // 1. SECURITY CHECK FIRST: Prevent unauthorized DB writes
    if (!isAdminOrMod && !comment.getAuthor().getUsername().equals(username)) {
      throw new AccessDeniedException("You don't have permission to delete this comment!");
    }

    // 2. DATABASE UPDATES SECOND: Only run if authorized
    Comment currentAncestor = comment.getParent();
    while (currentAncestor != null) {
      commentRepository.decrementReplyCount(currentAncestor.getId());
      currentAncestor = currentAncestor.getParent();
    }

    // 3. DELETE LAST
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

    VoteType userVote =
        voteRepository
            .findByVoter_IdAndComment_Id(user.getId(), commentId)
            .map(Vote::getType)
            .orElse(null);

    return commentMapper.toDTO(comment, userVote);
  }

  @Transactional(readOnly = true)
  public Page<CommentDTO> getThreadComments(
      UUID threadId, int page, int size, String sortBy, Authentication authentication) {

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

    UUID userId = resolveUserId(authentication);
    Map<UUID, VoteType> voteMap = buildVoteMap(userId, commentPage.getContent());
    return commentPage.map(c -> commentMapper.toDTO(c, voteMap.get(c.getId())));
  }

  @Transactional(readOnly = true)
  public Page<CommentDTO> getCommentReplies(
      UUID commentId, int page, int size, String sortBy, Authentication authentication) {
    Comment comment =
        commentRepository.findById(commentId).orElseThrow(CommentNotFoundException::new);

    Sort sort =
        switch (sortBy) {
          case "top score" -> Sort.by("score").descending();
          case "top interaction" -> Sort.by("replyCount").descending();
          case "older" -> Sort.by("createdAt").ascending();
          default -> Sort.by("createdAt").descending();
        };

    Pageable pageable = PageRequest.of(page, size, sort);
    Page<Comment> commentPage = commentRepository.getAllByParent_Id(commentId, pageable);

    UUID userId = resolveUserId(authentication);
    Map<UUID, VoteType> voteMap = buildVoteMap(userId, commentPage.getContent());
    return commentPage.map(c -> commentMapper.toDTO(c, voteMap.get(c.getId())));
  }

  private Map<UUID, VoteType> buildVoteMap(UUID userId, List<Comment> comments) {
    if (userId == null || comments.isEmpty()) return Map.of();
    List<UUID> commentIds = comments.stream().map(Comment::getId).toList();
    return voteRepository.findAllByVoterIdAndCommentIdIn(userId, commentIds).stream()
        .collect(Collectors.toMap(v -> v.getComment().getId(), Vote::getType));
  }

  private UUID resolveUserId(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) return null;
    return userRepository.findByIdentifier(authentication.getName()).map(User::getId).orElse(null);
  }
}
