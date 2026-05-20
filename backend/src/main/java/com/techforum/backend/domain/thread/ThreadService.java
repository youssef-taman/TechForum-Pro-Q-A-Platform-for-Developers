package com.techforum.backend.domain.thread;

import static com.techforum.backend.domain.thread.QThread.thread;

import com.querydsl.core.BooleanBuilder;
import com.techforum.backend.common.exception.thread.DuplicateThreadException;
import com.techforum.backend.common.exception.thread.ThreadNotFoundException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.tag.Tag;
import com.techforum.backend.domain.tag.mappers.TagMapper;
import com.techforum.backend.domain.thread.dtos.*;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import com.techforum.backend.domain.thread.mappers.ThreadMapper;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
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

  private float[] getThreadEmbedding(ThreadSearchDTO threadSearchDTO) {
    /*
    TODO:
        * Connect to python's duplication detection model
        * Using the search and filter proprties, return the embedding
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

  private List<DuplicateThreadDTO> findSimilarThreadsInTrending(float[] threadEmbedding) {
    /*
    TODO:
        * Connect to Redis
        * Using RediSearch, return similar threads
     */

    List<DuplicateThreadDTO> duplicateThreadDTOS = new ArrayList<>();
    //    duplicateThreadDTOS = redis.findSimilarThreads();
    return duplicateThreadDTOS;
  }

  private void checkDuplicateInThreadArchive(
      float[] threadEmbedding, double threshold, Limit limit) {

    List<DuplicateThreadDTO> duplicateThreads =
        threadRepository.findDuplicateWithThreshold(threadEmbedding, threshold, limit);

    if (!duplicateThreads.isEmpty()) {
      throw new DuplicateThreadException(duplicateThreads);
    }
  }

  private List<DuplicateThreadDTO> findSimilarThreadsInArchive(
      float[] threadEmbedding, double threshold, Limit limit) {

    return threadRepository.findDuplicateWithThreshold(threadEmbedding, threshold, limit);
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
      checkDuplicateInThreadArchive(embedding, 0.95, Limit.of(3));
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
  private BooleanBuilder buildSearchEngine(ThreadSearchDTO threadSearchDTO, String targetAuthor) {

    QThread thread = QThread.thread;
    BooleanBuilder filterBuilder = new BooleanBuilder();

    if (!threadSearchDTO.semanticAiSearch()) {
      if (threadSearchDTO.keyword() != null && !threadSearchDTO.keyword().isBlank()) {
        String[] searchWords = threadSearchDTO.keyword().trim().split("\\s+");
        BooleanBuilder keywordBuilder = new BooleanBuilder();

        for (String word : searchWords) {
          keywordBuilder.andAnyOf(
              thread.title.containsIgnoreCase(word), thread.body.containsIgnoreCase(word));
        }

        filterBuilder.and(keywordBuilder);
      }
    }

    ThreadStatus status = threadSearchDTO.status();
    if (status != null) {
      filterBuilder.and(thread.status.eq(status));
    }

    if (threadSearchDTO.tags() != null) {
      Set<String> tags =
          threadSearchDTO.tags().stream().map(String::toLowerCase).collect(Collectors.toSet());

      if (!tags.isEmpty()) {
        filterBuilder.and(thread.tags.any().name.in(tags));
      }
    }

    Instant fromTime = threadSearchDTO.from();
    Instant toTime = threadSearchDTO.to();
    if (fromTime != null && toTime != null) {
      filterBuilder.and(thread.createdAt.between(fromTime, toTime));
    } else if (fromTime != null) {
      filterBuilder.and(thread.createdAt.goe(fromTime));
    } else if (toTime != null) {
      filterBuilder.and(thread.createdAt.loe(toTime));
    }

    if (targetAuthor != null) {
      filterBuilder.and(QThread.thread.author.username.equalsIgnoreCase(targetAuthor));
    }

    Integer minComments = threadSearchDTO.minCommentsNumber();
    if (minComments != null) {
      filterBuilder.and(thread.numberComments.goe(minComments));
    }

    Integer maxComments = threadSearchDTO.maxCommentsNumber();
    if (maxComments != null) {
      filterBuilder.and(thread.numberComments.loe(maxComments));
    }

    return filterBuilder;
  }

  @NonNull
  private Pageable buildPage(int page, int size, String sortBy) {

    Sort sort =
        switch (sortBy) {
          case "top" -> Sort.by("numberComments").descending();
          case "older" -> Sort.by("createdAt").ascending();
          default -> Sort.by("createdAt").descending();
        };

    return PageRequest.of(page, size, sort);
  }

  @Transactional(readOnly = true)
  public Page<ThreadDTO> getUserThreads(ThreadSearchDTO threadSearchDTO, String username) {

    assert (Objects.equals(username, threadSearchDTO.author()));
    Optional<User> user = userRepository.findByIdentifier(username);
    if (user.isEmpty()) {
      throw new UserNotFoundException(username);
    }

    BooleanBuilder filterBuilder = buildSearchEngine(threadSearchDTO, username);
    Pageable pageable =
        buildPage(threadSearchDTO.page(), threadSearchDTO.size(), threadSearchDTO.sortBy());

    Page<Thread> threadPage = threadRepository.findAll(filterBuilder, pageable);
    return threadPage.map(threadMapper::toDTO);
  }

  @Transactional(readOnly = true)
  public Page<ThreadDTO> getTimeline(ThreadSearchDTO threadSearchDTO) {

    BooleanBuilder filterBuilder = buildSearchEngine(threadSearchDTO, threadSearchDTO.author());
    Pageable pageable =
        buildPage(threadSearchDTO.page(), threadSearchDTO.size(), threadSearchDTO.sortBy());

    Page<Thread> threadPage = threadRepository.findAll(filterBuilder, pageable);
    return threadPage.map(threadMapper::toDTO);
  }

  @Transactional(readOnly = true)
  public Page<ThreadDTO> searchThreads(ThreadSearchDTO threadSearchDTO) {

    BooleanBuilder filterBuilder = new BooleanBuilder();
    Pageable pageable =
        buildPage(threadSearchDTO.page(), threadSearchDTO.size(), threadSearchDTO.sortBy());

    if (!threadSearchDTO.semanticAiSearch()) {
      filterBuilder = buildSearchEngine(threadSearchDTO, threadSearchDTO.author());
      Page<Thread> threadPage = threadRepository.findAll(filterBuilder, pageable);
      return threadPage.map(threadMapper::toDTO);
    }

    float[] embedding = getThreadEmbedding(threadSearchDTO);
    List<DuplicateThreadDTO> duplicateThreadDTOS;

    duplicateThreadDTOS = findSimilarThreadsInTrending(embedding);
    if (duplicateThreadDTOS.isEmpty()) {
      duplicateThreadDTOS = findSimilarThreadsInArchive(embedding, 0.7, Limit.of(100));
    }
    if (duplicateThreadDTOS.isEmpty()) {
      return new PageImpl<>(Collections.emptyList(), pageable, 0);
    }

    List<UUID> orderedIds = duplicateThreadDTOS.stream().map(DuplicateThreadDTO::threadId).toList();

    filterBuilder = buildSearchEngine(threadSearchDTO, threadSearchDTO.author());
    filterBuilder.and(QThread.thread.id.in(orderedIds));

    Iterable<Thread> filteredIterable = threadRepository.findAll(filterBuilder);
    List<Thread> filteredThreads = new ArrayList<>();

    filteredIterable.forEach(filteredThreads::add);
    filteredThreads.sort(Comparator.comparingInt(t -> orderedIds.indexOf(t.getId())));

    int start = (int) pageable.getOffset();
    int end = Math.min((start + pageable.getPageSize()), filteredThreads.size());

    List<ThreadDTO> sortedDtos = new ArrayList<>();
    if (start < filteredThreads.size()) {
      sortedDtos = filteredThreads.subList(start, end).stream().map(threadMapper::toDTO).toList();
    }

    return new PageImpl<>(sortedDtos, pageable, filteredThreads.size());
  }
}
