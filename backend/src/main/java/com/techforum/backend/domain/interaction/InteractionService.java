package com.techforum.backend.domain.interaction;

import com.techforum.backend.common.exception.thread.ThreadNotFoundException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.thread.ThreadRepository;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import jakarta.transaction.Transactional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class InteractionService {
  private final BookmarkRepository bookmarkRepository;
  private final UserRepository userRepository;
  private final ThreadRepository threadRepository;

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
}
