package com.techforum.backend.domain.comment;

import com.techforum.backend.domain.thread.Thread;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentRepository extends JpaRepository<Comment, UUID>{

    @EntityGraph(attributePaths = {"author"})
    Page<Comment> findByThread_Id(UUID threadId, Pageable pageable);

    @EntityGraph(attributePaths = {"author"})
    Page<Comment> getAllByParent_Id(UUID parentId, Pageable pageable);

}
