package com.techforum.backend.domain.comment;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID> {

  @EntityGraph(attributePaths = {"author"})
  Page<Comment> findByThread_Id(UUID threadId, Pageable pageable);

  @EntityGraph(attributePaths = {"author"})
  Page<Comment> getAllByParent_Id(UUID parentId, Pageable pageable);
}
