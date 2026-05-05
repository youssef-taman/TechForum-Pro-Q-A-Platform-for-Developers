package com.techforum.backend.domain.interaction;

import com.techforum.backend.domain.comment.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VoteRepository extends JpaRepository<Vote, UUID> {

    List<Vote> findByVoter_IdAndCommentIn(UUID voter_id, Collection<Comment> comment);

    Optional<Vote> findByVoter_IdAndComment_Id(UUID voterId, UUID commentId);
}
