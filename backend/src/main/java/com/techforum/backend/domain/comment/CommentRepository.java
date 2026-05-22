package com.techforum.backend.domain.comment;

import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

  @Override
  @EntityGraph(attributePaths = {"author"})
  Optional<Comment> findById(@NonNull UUID commentId);

  @EntityGraph(attributePaths = {"author"})
  Page<Comment> findByThread_IdAndParentIsNull(UUID threadId, Pageable pageable);

  @EntityGraph(attributePaths = {"author"})
  Page<Comment> getAllByParent_Id(UUID parentId, Pageable pageable);

  @Modifying
  @Query("UPDATE Comment c SET c.replyCount = c.replyCount + 1 WHERE c.id = :parentId")
  void incrementReplyCount(@Param("parentId") UUID parentId);

  @Modifying
  @Query(
      "UPDATE Comment c SET c.replyCount = c.replyCount - 1 WHERE c.id = :parentId AND c.replyCount > 0")
  void decrementReplyCount(@Param("parentId") UUID parentId);
}
