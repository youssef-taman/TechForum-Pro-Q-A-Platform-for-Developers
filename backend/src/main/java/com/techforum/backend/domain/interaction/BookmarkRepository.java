package com.techforum.backend.domain.interaction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, UUID> {

    @Query(value = """
        SELECT b FROM Bookmark b
        JOIN FETCH b.thread th
        JOIN FETCH th.author
        WHERE b.user.id = :user_id
        ORDER BY b.createdAt DESC
        """,
        countQuery = """
        SELECT COUNT (b) FROM Bookmark b
        WHERE b.user.id = :user_id
        """
    )
    Page<Bookmark> findAllUserBookmarks(@Param("user_id") UUID userId, Pageable pageable);

}
