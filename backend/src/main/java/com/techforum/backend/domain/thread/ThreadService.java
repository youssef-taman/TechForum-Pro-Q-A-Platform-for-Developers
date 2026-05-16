package com.techforum.backend.domain.thread;

import com.querydsl.core.BooleanBuilder;
import com.techforum.backend.common.exception.thread.DuplicateThreadException;
import com.techforum.backend.common.exception.thread.ThreadNotFoundException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.tag.Tag;
import com.techforum.backend.domain.tag.mappers.TagMapper;
import com.techforum.backend.domain.thread.dtos.DuplicateThreadDTO;
import com.techforum.backend.domain.thread.dtos.ThreadCreateDTO;
import com.techforum.backend.domain.thread.dtos.ThreadDTO;
import com.techforum.backend.domain.thread.dtos.ThreadUpdateDTO;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import com.techforum.backend.domain.thread.mappers.ThreadMapper;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import lombok.NonNull;
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
public class ThreadService {

  private final ThreadRepository threadRepository;
  private final UserRepository userRepository;
  private final ThreadMapper threadMapper;
  private final double THREAD_DUPLICATION_SIMILARITY_THRESHOLD = 0.95;
  private final TagMapper tagMapper;

  private float[] getThreadEmbedding(ThreadCreateDTO threadCreateDTO) {
    /*
    TODO:
        * Connect to python's duplication detection model
        * Using the thread label and body, return the embedding
     */

    float[] embedding = new float[768];
    //        Thread embedding process
    return embedding;
  }

  private void checkDuplicationInTrendingThreads(float[] threadEmbedding) {
    /*
    TODO:
        * Connect to Redis
        * Using RediSearch, if there is a similar thread
        * If so, throw an exception with its ID
     */

    /*
    UUID duplicateThreadId = redis.checkDuplication();
    if (duplicateThreadId != null){
        throw new DuplicateThreadException(duplicateThreadId);
    }
     */
  }

  private void checkDuplicateInThreadArchive(float[] threadEmbedding) {

    Set<DuplicateThreadDTO> duplicateThreads =
        threadRepository.findDuplicateWithThreshold(
            threadEmbedding, THREAD_DUPLICATION_SIMILARITY_THRESHOLD);

    if (!duplicateThreads.isEmpty()) {
      throw new DuplicateThreadException(duplicateThreads);
    }
  }

  private Set<Tag> classifyThreadWithTags(float[] threadEmbedding) {
    /*
    TODO:
        * Connect to python's question auto tagging model
        * Using the thread embedding, return the set of tags describing the content
     */

    Set<Tag> tags = new HashSet<>();
    //        Question tagging process
    return tags;
  }

  private @NonNull Thread saveThread(
      ThreadCreateDTO threadCreateDTO, User author, float[] embedding) {
    Thread thread = this.threadMapper.toEntity(threadCreateDTO);
    thread.setAuthor(author);
    thread.setStatus(ThreadStatus.OPEN);
    thread.addTags(classifyThreadWithTags(embedding));

    ThreadEmbedding threadEmbedding = new ThreadEmbedding(thread, embedding);
    threadRepository.save(thread);
    threadRepository.saveThreadEmbedding(threadEmbedding);
    return thread;
  }

  @Transactional
  public ThreadDTO createThread(
      ThreadCreateDTO threadCreateDTO, boolean ignoreDuplicates, Authentication authentication) {

    String currentUserIdentifier = authentication.getName();
    User author =
        userRepository
            .findByIdentifier(currentUserIdentifier)
            .orElseThrow(() -> new UserNotFoundException(currentUserIdentifier));

    float[] embedding = getThreadEmbedding(threadCreateDTO);

    if (!ignoreDuplicates) {
      checkDuplicationInTrendingThreads(embedding);
      checkDuplicateInThreadArchive(embedding);
    }

    Thread thread = saveThread(threadCreateDTO, author, embedding);
    return threadMapper.toDTO(thread);
  }

  @Transactional(readOnly = true)
  public ThreadDTO expandThread(String username, UUID threadId) {

    Optional<Thread> thread = threadRepository.findExpandedThreadById(threadId);
    if (thread.isEmpty()) {
      throw new ThreadNotFoundException(threadId, username);
    }

    Thread expandedThread = thread.get();

    if (!expandedThread.getAuthor().getUsername().equals(username)) {
      throw new ThreadNotFoundException(threadId, username);
    }

    return threadMapper.toDTO(expandedThread);
  }

  @Transactional
  public void deleteThread(UUID threadId, Authentication authentication) {

    Thread thread =
        threadRepository
            .findById(threadId)
            .orElseThrow(() -> new ThreadNotFoundException(threadId, authentication.getName()));

    boolean isAdminOrMod =
        authentication.getAuthorities().stream()
            .anyMatch(
                a ->
                    a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_MODERATOR"));

    if (!isAdminOrMod && !thread.getAuthor().getUsername().equals(authentication.getName())) {
      throw new AccessDeniedException("You don't have permission to delete this thread!");
    }

    threadRepository.delete(thread);
  }

  @Transactional
  public ThreadDTO updateThread(
      UUID threadId, ThreadUpdateDTO threadUpdateDTO, Authentication authentication) {

    Thread thread =
        threadRepository
            .findById(threadId)
            .orElseThrow(() -> new ThreadNotFoundException(threadId, authentication.getName()));

    if (!thread.getAuthor().getUsername().equals(authentication.getName())) {
      throw new AccessDeniedException("You don't have permission to modify this thread!");
    }

    threadMapper.updateThreadFromDto(threadUpdateDTO, thread);
    threadRepository.save(thread);

    return threadMapper.toDTO(thread);
  }

  @NonNull
  private Page<ThreadDTO> getThreadDTOS(
      int page,
      int size,
      ThreadStatus status,
      Set<String> tags,
      String sortBy,
      QThread thread,
      BooleanBuilder filterBuilder) {

    if (status != null) {
      filterBuilder.and(thread.status.eq(status));
    }

    if (tags != null && !tags.isEmpty()) {
      filterBuilder.and(thread.tags.any().name.in(tags));
    }

    sortBy = (sortBy != null) ? sortBy.toLowerCase() : "latest";
    Sort sort =
        switch (sortBy) {
          case "top" -> Sort.by("numberComments").descending();
          case "older" -> Sort.by("createdAt").ascending();
          default -> Sort.by("createdAt").descending();
        };

    Pageable pageable = PageRequest.of(page, size, sort);
    Page<Thread> threadPage = threadRepository.findAll(filterBuilder, pageable);
    return threadPage.map(threadMapper::toDTO);
  }

  @Transactional(readOnly = true)
  public Page<ThreadDTO> getUserThreads(
      String username, int page, int size, String sortBy, ThreadStatus status, Set<String> tags) {

    Optional<User> user = userRepository.findByIdentifier(username);
    if (user.isEmpty()) {
      throw new UserNotFoundException(username);
    }

    QThread thread = QThread.thread;
    BooleanBuilder filterBuilder = new BooleanBuilder();

    filterBuilder.and(thread.author.id.eq(user.get().getId()));

    return getThreadDTOS(page, size, status, tags, sortBy, thread, filterBuilder);
  }

  @Transactional(readOnly = true)
  public Page<ThreadDTO> getTimeline(
      int page, int size, String sortBy, ThreadStatus status, Set<String> tags) {

    QThread thread = QThread.thread;
    BooleanBuilder filterBuilder = new BooleanBuilder();

    return getThreadDTOS(page, size, status, tags, sortBy, thread, filterBuilder);
  }
}
