package com.techforum.backend.domain.interaction;

import com.techforum.backend.domain.comment.Comment;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface VoteRepository extends JpaRepository<Vote, UUID> {

  List<Vote> findByVoter_IdAndCommentIn(UUID voterId, Collection<Comment> comments);

  Optional<Vote> findByVoter_IdAndComment_Id(UUID voterId, UUID commentId);

  @Query("SELECT v FROM Vote v WHERE v.voter.id = :userId AND v.comment.id IN :commentIds")
  List<Vote> findAllByVoterIdAndCommentIdIn(
      @Param("userId") UUID userId, @Param("commentIds") List<UUID> commentIds);
}
