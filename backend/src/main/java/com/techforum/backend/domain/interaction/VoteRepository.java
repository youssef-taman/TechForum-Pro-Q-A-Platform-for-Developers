package com.techforum.backend.domain.interaction;

import com.techforum.backend.domain.comment.Comment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoteRepository extends JpaRepository<Vote, UUID> {

  List<Vote> findByVoter_IdAndCommentIn(UUID voterId, Collection<Comment> comments);

  Optional<Vote> findByVoter_IdAndComment_Id(UUID voterId, UUID commentId);
}
