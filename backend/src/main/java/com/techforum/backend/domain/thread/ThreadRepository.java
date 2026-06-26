package com.techforum.backend.domain.thread;

import com.querydsl.core.types.Predicate;
import com.techforum.backend.domain.thread.dtos.DuplicateThreadProjection;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ThreadRepository
    extends JpaRepository<Thread, UUID>, QuerydslPredicateExecutor<Thread> {

  @Override
  @EntityGraph(attributePaths = {"author"})
  Optional<Thread> findById(@NonNull UUID threadId);

  @Override
  @NonNull
  @EntityGraph(attributePaths = {"author"})
  Iterable<Thread> findAll(Predicate predicate);

  @Override
  @NonNull
  @EntityGraph(attributePaths = {"author"})
  Page<Thread> findAll(Predicate predicate, Pageable pageable);

  @EntityGraph(attributePaths = {"author", "tags"})
  Optional<Thread> findExpandedThreadById(UUID threadId);

  @Query(
      value =
          """
        SELECT e.thread_id AS threadId,
               u.username AS authorUsername,
               th.title AS title,
               (1 - (e.embedding <=> CAST(:embedding AS VECTOR))) AS cosineSimilarityScore,
               th.created_at AS createdAt
        FROM thread_embeddings e
        JOIN Threads th ON e.thread_id = th.id
        JOIN Users u ON u.id = th.user_id
        WHERE (1 - (e.embedding <=> CAST(:embedding AS VECTOR))) >= :threshold
        ORDER BY e.embedding <=> CAST(:embedding AS VECTOR) ASC
        LIMIT :limit
        """,
      nativeQuery = true)
  List<DuplicateThreadProjection> findDuplicateWithThreshold(
      @Param("embedding") String embeddingString,
      @Param("threshold") double threshold,
      @Param("limit") int limit);

  @Modifying
  @Transactional
  @Query(
      value =
          """
          INSERT INTO thread_embeddings (thread_id, embedding)
          VALUES (:#{#thread_embedding.thread.id}, CAST(:#{T(java.util.Arrays).toString(#thread_embedding.embedding)} AS vector))
          """,
      nativeQuery = true)
  void saveThreadEmbedding(@Param("thread_embedding") ThreadEmbedding threadEmbedding);

  @Modifying
  @Transactional
  @Query(
      value =
          """
          UPDATE thread_embeddings
          SET embedding = CAST(:#{T(java.util.Arrays).toString(#thread_embedding.embedding)} AS vector)
          WHERE thread_id = :#{#thread_embedding.thread.id}
          """,
      nativeQuery = true)
  void updateThreadEmbedding(@Param("thread_embedding") ThreadEmbedding threadEmbedding);

  @Modifying
  @Transactional
  @Query(
      value =
          """
          DELETE FROM thread_embeddings
          WHERE thread_id = :threadId
          """,
      nativeQuery = true)
  void deleteThreadEmbeddingByThreadId(@Param("threadId") UUID threadId);

  long countByStatus(ThreadStatus status);
}
