package com.techforum.backend.domain.thread;

import java.util.Collection;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ThreadRepository extends JpaRepository<Thread, UUID> {

  Page<Thread> findByAuthor_Id(UUID authorId, Pageable pageable);

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
      value =
          """
              SELECT th FROM Thread th
              JOIN FETCH th.author
              """,
      countQuery = "SELECT count(th) FROM Thread th")
  Page<Thread> retrieveAllWithAuthor(Pageable pageable);

  @EntityGraph(attributePaths = {"author"})
  Page<Thread> findByTags_IdIn(Collection<UUID> tagIds, Pageable pageable);

  @Query(
      """
            SELECT e.embedding
            FROM ThreadEmbedding e
            WHERE e.thread.id = :thread_id
    """)
  float[] getThreadEmbedding(@Param("thread_id") UUID threadId);

  @Query(
      """
        SELECT e
        FROM ThreadEmbedding e
    """)
  Page<ThreadEmbedding> getAllThreadEmbeddings(Pageable pageable);
}
