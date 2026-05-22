package com.techforum.backend.domain.interaction;

import com.techforum.backend.common.exception.comment.CommentNotFoundException;
import com.techforum.backend.common.exception.thread.ThreadNotFoundException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.comment.Comment;
import com.techforum.backend.domain.comment.CommentRepository;
import com.techforum.backend.domain.interaction.dtos.BookmarkDTO;
import com.techforum.backend.domain.interaction.enums.VoteType;
import com.techforum.backend.domain.interaction.mappers.BookmarkMapper;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.ThreadRepository;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class InteractionService {
  private final BookmarkRepository bookmarkRepository;
  private final UserRepository userRepository;
  private final ThreadRepository threadRepository;
  private final CommentRepository commentRepository;
  private final VoteRepository voteRepository;
  private final BookmarkMapper bookmarkMapper;

  @Transactional
  public void addBookmark(UUID threadId, Authentication authentication) {
    String currentUserIdentifier = authentication.getName();

    User user =
        userRepository
            .findByIdentifier(currentUserIdentifier)
            .orElseThrow(UserNotFoundException::new);

    if (!threadRepository.existsById(threadId)) {
      throw new ThreadNotFoundException();
    }

    if (bookmarkRepository.existsByUserIdAndThreadId(user.getId(), threadId)) {
      return;
    }

    Thread threadProxy = threadRepository.getReferenceById(threadId);

    Bookmark newBookmark = Bookmark.builder().user(user).thread(threadProxy).build();

    bookmarkRepository.save(newBookmark);
  }

  @Transactional
  public void removeBookmark(UUID threadId, Authentication authentication) {
    String currentUserIdentifier = authentication.getName();

    User user =
        userRepository
            .findByIdentifier(currentUserIdentifier)
            .orElseThrow(UserNotFoundException::new);

    bookmarkRepository
        .findByUserIdAndThreadId(user.getId(), threadId)
        .ifPresent(bookmarkRepository::delete);
  }

  @Transactional(readOnly = true)
  public Page<BookmarkDTO> listUserBookmarks(Pageable pageable, Authentication authentication) {
    String currentUserIdentifier = authentication.getName();

    User user =
        userRepository
            .findByIdentifier(currentUserIdentifier)
            .orElseThrow(UserNotFoundException::new);

    return bookmarkRepository
        .findAllUserBookmarks(user.getId(), pageable)
        .map(bookmarkMapper::toDTO);
  }

  @Transactional
  public void voteComment(UUID commentId, VoteType voteType, Authentication authentication) {
    String currentUserIdentifier = authentication.getName();

    User user =
        userRepository
            .findByIdentifier(currentUserIdentifier)
            .orElseThrow(UserNotFoundException::new);

    Comment comment =
        commentRepository.findById(commentId).orElseThrow(CommentNotFoundException::new);

    Optional<Vote> existingVoteOpt =
        voteRepository.findByVoter_IdAndComment_Id(user.getId(), commentId);

    if (existingVoteOpt.isPresent()) {
      Vote existingVote = existingVoteOpt.get();

      if (existingVote.getType() == voteType) {
        comment.setScore(comment.getScore() - voteType.getValue());
        voteRepository.delete(existingVote);
      } else {
        int delta = voteType.getValue() - existingVote.getType().getValue();
        comment.setScore(comment.getScore() + delta);
        existingVote.setType(voteType);
      }
    } else {
      comment.setScore(comment.getScore() + voteType.getValue());

      Vote newVote = Vote.builder().comment(comment).voter(user).type(voteType).build();

      voteRepository.save(newVote);
    }
  }
}
