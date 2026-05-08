package com.techforum.backend.domain.interaction;

import com.techforum.backend.common.persistence.BaseEntity;
import com.techforum.backend.domain.comment.Comment;
import com.techforum.backend.domain.interaction.enums.VoteType;
import com.techforum.backend.domain.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(
    name = "Votes",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "comment_id"})})
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class Vote extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false, updatable = false)
  @NotNull
  private User voter;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "comment_id", nullable = false, updatable = false)
  @NotNull
  private Comment comment;

  @Column(nullable = false, updatable = true)
  @JdbcTypeCode(SqlTypes.NAMED_ENUM)
  @NotNull
  public VoteType type;
}
