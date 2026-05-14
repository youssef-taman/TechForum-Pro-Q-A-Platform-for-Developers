package com.techforum.backend.domain.thread;

import com.techforum.backend.common.exception.thread.DuplicateThreadException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.tag.Tag;
import com.techforum.backend.domain.thread.dtos.DuplicateThreadDTO;
import com.techforum.backend.domain.thread.dtos.ThreadCreateDTO;
import com.techforum.backend.domain.thread.dtos.ThreadDTO;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import com.techforum.backend.domain.thread.mappers.ThreadMapper;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import jakarta.transaction.Transactional;
import java.util.HashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ThreadService {

  private final UserRepository userRepository;
  private final ThreadRepository threadRepository;
  private final ThreadMapper threadMapper;
  private final double THREAD_DUPLICATION_SIMILARITY_THRESHOLD = 0.95;

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
            .orElseThrow(UserNotFoundException::new);

    float[] embedding = getThreadEmbedding(threadCreateDTO);

    if (!ignoreDuplicates) {
      checkDuplicationInTrendingThreads(embedding);
      checkDuplicateInThreadArchive(embedding);
    }

    Thread thread = saveThread(threadCreateDTO, author, embedding);
    return threadMapper.toDTO(thread);
  }

  @Transactional
  public ThreadDTO forceThreadCreation(
      ThreadCreateDTO threadCreateDTO, Authentication authentication) {

    String currentUserIdentifier = authentication.getName();
    User author =
        userRepository
            .findByIdentifier(currentUserIdentifier)
            .orElseThrow(UserNotFoundException::new);

    float[] embedding = getThreadEmbedding(threadCreateDTO);
    Thread thread = saveThread(threadCreateDTO, author, embedding);

    return threadMapper.toDTO(thread);
  }
}
