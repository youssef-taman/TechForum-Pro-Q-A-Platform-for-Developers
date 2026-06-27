package com.techforum.backend.domain.thread;

import com.querydsl.core.BooleanBuilder;
import com.techforum.backend.common.exception.thread.DuplicateThreadException;
import com.techforum.backend.common.exception.thread.ThreadNotFoundException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.ai.AiIntegrationService;
import com.techforum.backend.domain.notification.NotificationController;
import com.techforum.backend.domain.notification.NotificationService;
import com.techforum.backend.domain.notification.dtos.NotificationDTO;
import com.techforum.backend.domain.tag.Tag;
import com.techforum.backend.domain.tag.TagRepository;
import com.techforum.backend.domain.tag.dtos.TagDTO;
import com.techforum.backend.domain.thread.cache.EmbeddingConverter;
import com.techforum.backend.domain.thread.cache.RedisCacheRepository;
import com.techforum.backend.domain.thread.cache.TopThreadCache;
import com.techforum.backend.domain.thread.dtos.*;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import com.techforum.backend.domain.thread.mappers.ThreadMapper;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import com.techforum.backend.domain.user.enums.RoleType;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ThreadService {

  public static final double MATCHING_THRESHOLD = 0.65;
  private final ThreadRepository threadRepository;
  private final UserRepository userRepository;
  private final ThreadMapper threadMapper;
  private final TagRepository tagRepository;
  private final AiIntegrationService aiIntegrationService;
  private final RedisCacheRepository redisRepository;
  private final ApplicationEventPublisher eventPublisher;
  private final NotificationController notificationController;
  private final NotificationService notificationService;

  private float[] getThreadEmbedding(ThreadCreateDTO threadCreateDTO) {
    double[] embeddingDouble =
        aiIntegrationService.getEmbedding(threadCreateDTO.title() + " " + threadCreateDTO.body());

    float[] embedding = new float[embeddingDouble.length];
    for (int i = 0; i < embeddingDouble.length; i++) {
      embedding[i] = (float) embeddingDouble[i];
    }

    return embedding;
  }

  private float[] getThreadEmbedding(ThreadSearchDTO threadSearchDTO) {
    double[] embeddingDouble =
        aiIntegrationService.getEmbedding(
            threadSearchDTO.keyword() + " " + threadSearchDTO.tags().toString());

    float[] embedding = new float[embeddingDouble.length];
    for (int i = 0; i < embeddingDouble.length; i++) {
      embedding[i] = (float) embeddingDouble[i];
    }

    return embedding;
  }

  private float[] getThreadEmbedding(ThreadUpdateDTO threadUpdateDTO) {
    double[] embeddingDouble =
        aiIntegrationService.getEmbedding(threadUpdateDTO.title() + " " + threadUpdateDTO.body());

    float[] embedding = new float[embeddingDouble.length];
    for (int i = 0; i < embeddingDouble.length; i++) {
      embedding[i] = (float) embeddingDouble[i];
    }

    return embedding;
  }

  private void checkDuplicationInTrendingThreads(float[] threadEmbedding, int limit) {

    byte[] vectorBytes = EmbeddingConverter.toLittleEndian(threadEmbedding);
    List<TopThreadCache> nearestThreads = redisRepository.findTopNearestThreads(vectorBytes, limit);
    List<DuplicateThreadDTO> duplicateThreadDTOList = new ArrayList<>();

    for (TopThreadCache cacheItem : nearestThreads) {

      double similarity = 1.0 - cacheItem.getScore();
      if (similarity >= ThreadService.MATCHING_THRESHOLD) {
        UUID duplicateThreadId = UUID.fromString(cacheItem.getThreadId());
        Thread originalThread = threadRepository.findById(duplicateThreadId).orElseThrow();

        DuplicateThreadDTO duplicateThreadDTO =
            threadMapper.toDuplicateDTO(originalThread, similarity);
        duplicateThreadDTOList.add(duplicateThreadDTO);
      }
    }

    if (!duplicateThreadDTOList.isEmpty()) {
      throw new DuplicateThreadException(duplicateThreadDTOList);
    }
  }

  private List<DuplicateThreadDTO> searchDuplicateThreadsInArchive(
      float[] threadEmbedding, double threshold, int limit) {

    String vectorString = Arrays.toString(threadEmbedding);
    List<DuplicateThreadProjection> duplicateProjections =
        threadRepository.findDuplicateWithThreshold(vectorString, threshold, limit);

    return duplicateProjections.stream().map(threadMapper::toDuplicateDTO).toList();
  }

  private void checkDuplicateInThreadArchive(float[] threadEmbedding, int limit) {

    List<DuplicateThreadDTO> duplicateThreads =
        searchDuplicateThreadsInArchive(threadEmbedding, MATCHING_THRESHOLD, limit);

    if (!duplicateThreads.isEmpty()) {
      throw new DuplicateThreadException(duplicateThreads);
    }
  }

  public String[] suggestTags(String title, String body) {
    return aiIntegrationService.getTags(title, body);
  }

  private @NonNull Thread saveThread(
      ThreadCreateDTO threadCreateDTO,
      User author,
      Set<Tag> managedTags,
      float[] embedding,
      ThreadStatus status) {
    Thread thread = this.threadMapper.toEntity(threadCreateDTO);
    thread.setAuthor(author);
    thread.setStatus(status);
    thread.setCreatedAt(Instant.now());
    thread.setTags(managedTags);
    threadRepository.save(thread);

    ThreadEmbedding threadEmbedding = new ThreadEmbedding(thread, embedding);
    threadRepository.saveThreadEmbedding(threadEmbedding);

    return thread;
  }

  private @NonNull Set<Tag> getOrCreateTags(Set<TagDTO> tagDTOS) {
    Set<Tag> managedTags = new HashSet<>();
    for (TagDTO tagDTO : tagDTOS) {
      String tagName = tagDTO.name().trim().toLowerCase();

      Tag tag =
          tagRepository.findByName(tagName).orElseGet(() -> tagRepository.save(new Tag(tagName)));

      managedTags.add(tag);
    }
    return managedTags;
  }

  @Transactional(readOnly = true)
  public ThreadDTO getThreadById(UUID threadId) {
    Thread thread =
        threadRepository.findById(threadId).orElseThrow(() -> new ThreadNotFoundException());
    return threadMapper.toDTO(thread);
  }

  public List<DuplicateThreadDTO> checkDuplicates(
      @Valid ThreadCreateDTO threadCreateDTO, Authentication authentication) {

    String currentUserIdentifier = authentication.getName();
    userRepository
        .findByIdentifier(currentUserIdentifier)
        .orElseThrow(() -> new UserNotFoundException(currentUserIdentifier));

    float[] embedding = getThreadEmbedding(threadCreateDTO);
    if (embedding == null || embedding.length == 0) {
      return Collections.emptyList();
    }
    //      checkDuplicationInTrendingThreads(embedding, 3);
    return searchDuplicateThreadsInArchive(embedding, MATCHING_THRESHOLD, 3);
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

    if (embedding == null || embedding.length == 0) {
      embedding = new float[0];
    }
    Set<Tag> managedTags = getOrCreateTags(threadCreateDTO.tags());
    ThreadStatus initialStatus = ThreadStatus.PENDING;
    if (author.getRole() == RoleType.MODERATOR || author.getRole() == RoleType.ADMIN) {
      initialStatus = ThreadStatus.OPEN; // Mods and Admins bypass the queue
    }

    Thread thread = saveThread(threadCreateDTO, author, managedTags, embedding, initialStatus);

    eventPublisher.publishEvent(
        new ThreadCreatedEvent(thread.getId(), thread.getTitle(), thread.getBody()));

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

    threadRepository.deleteThreadEmbeddingByThreadId(threadId);
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
    if (threadUpdateDTO.tags() != null) {
      Set<Tag> managedTags = getOrCreateTags(threadUpdateDTO.tags());
      thread.setTags(managedTags);
    }

    float[] newEmbedding = getThreadEmbedding(threadUpdateDTO);
    ThreadEmbedding threadEmbedding = new ThreadEmbedding(thread, newEmbedding);

    threadRepository.save(thread);
    threadRepository.updateThreadEmbedding(threadEmbedding);

    // Notify thread author if an Admin/Mod changes their thread status
    if (threadUpdateDTO.status() != null
        && !thread.getAuthor().getUsername().equals(authentication.getName())) {
      String message =
          "@"
              + authentication.getName()
              + " changed your thread status to "
              + threadUpdateDTO.status().toString();
      String link = "/questions/" + threadId;

      NotificationDTO dto =
          notificationService.createNotification(
              thread.getAuthor().getUsername(), "STATUS_UPDATE", message, link);
      notificationController.sendNotificationToUser(thread.getAuthor().getUsername(), dto);
    }
    return threadMapper.toDTO(thread);
  }

  @NonNull
  private BooleanBuilder buildSearchEngine(ThreadSearchDTO threadSearchDTO, String targetAuthor) {

    QThread thread = QThread.thread;
    BooleanBuilder filterBuilder = new BooleanBuilder();
    filterBuilder.and(thread.status.ne(ThreadStatus.PENDING));

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

    if (targetAuthor != null && !targetAuthor.isBlank()) {
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
      String authorFilter = threadSearchDTO.author();
      if (authorFilter == null || authorFilter.isBlank()) {
          authorFilter = null; // ensure null if empty
      }
      filterBuilder = buildSearchEngine(threadSearchDTO, authorFilter);
      // filterBuilder.and(searchFilters);
      Page<Thread> threadPage = threadRepository.findAll(filterBuilder, pageable);
      return threadPage.map(threadMapper::toDTO);
    }

    float[] embedding = getThreadEmbedding(threadSearchDTO);
    List<DuplicateThreadDTO> duplicateThreadDTOS;

    duplicateThreadDTOS = searchDuplicateThreadsInArchive(embedding, 0.7, 100);
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

  @Transactional(readOnly = true)
  public Page<ThreadDTO> getPendingThreads(int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
    Page<Thread> pendingThreads = threadRepository.findByStatus(ThreadStatus.PENDING, pageable);
    return pendingThreads.map(threadMapper::toDTO);
  }

  @Transactional
  public ThreadDTO moderateThread(UUID threadId, Map<String, String> moderationData) {
    Thread thread =
        threadRepository
            .findById(threadId)
            .orElseThrow(() -> new ThreadNotFoundException(threadId, "Thread not found"));

    String action = moderationData.get("action");
    if ("approve".equalsIgnoreCase(action)) {
      thread.setStatus(ThreadStatus.OPEN);
    } else if ("reject".equalsIgnoreCase(action)) {
      thread.setStatus(ThreadStatus.CLOSED);
    } else {
      throw new IllegalArgumentException("Invalid action: " + action);
    }

    threadRepository.save(thread);
    return threadMapper.toDTO(thread);
  }
}
