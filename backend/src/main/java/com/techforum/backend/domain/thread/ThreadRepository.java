package com.techforum.backend.domain.thread;

import com.querydsl.core.types.Predicate;
import com.techforum.backend.domain.thread.dtos.DuplicateThreadDTO;
import java.util.Optional;
import java.util.Set;
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

@Repository
public interface ThreadRepository
    extends JpaRepository<Thread, UUID>, QuerydslPredicateExecutor<Thread> {

  @Override
  @EntityGraph(attributePaths = {"author"})
  Optional<Thread> findById(@NonNull UUID threadId);

  @Override
  @NonNull
  @EntityGraph(attributePaths = {"author"})
  Page<Thread> findAll(Predicate predicate, Pageable pageable);

  @EntityGraph(attributePaths = {"author", "tags"})
  Optional<Thread> findExpandedThreadById(UUID threadId);

  @Query(
      value =
          """
            SELECT th FROM Thread th
            JOIN FETCH th.author
            WHERE LOWER(th.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(th.body) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """,
      countQuery =
          """
            SELECT count(th) FROM Thread th
            WHERE LOWER(th.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(th.body) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
  Page<Thread> findByTitleOrBody(@Param("keyword") String keyword, Pageable pageable);

  @Query(
      """
            SELECT e.embedding
            FROM ThreadEmbedding e
            WHERE e.thread.id = :thread_id
    """)
  float[] getThreadEmbedding(@Param("thread_id") UUID threadId);

  @Query(
      value =
          """
        SELECT e.thread_id AS threadId,
               u.username AS authorUsername,
               th.title AS title,
               ((1 - (e.embedding <=> CAST(:embedding AS VECTOR)))) AS cosineSimilarityScore,
               th.created_at AS createdAt
        FROM thread_embeddings e
        JOIN Threads th ON e.thread_id = th.id
        JOIN Users u ON u.id = th.user_id
        WHERE (1 - (e.embedding <=> CAST(:embedding AS VECTOR))) >= :threshold
        ORDER BY e.embedding <=> CAST(:embedding AS VECTOR) ASC
        LIMIT 3
        """,
      nativeQuery = true)
  Set<DuplicateThreadDTO> findDuplicateWithThreshold(
      @Param("embedding") float[] embedding, @Param("threshold") double threshold);

  @Modifying
  @Query(
      value =
          """
          INSERT INTO thread_embeddings (thread_id, embedding)
          VALUES (:#{#thread_embedding.thread.id}, CAST(:#{#thread_embedding.embedding} AS VECTOR))
    """,
      nativeQuery = true)
  void saveThreadEmbedding(@Param("thread_embedding") ThreadEmbedding threadEmbedding);
}
