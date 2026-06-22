package com.techforum.backend.domain.comment;

import com.techforum.backend.common.persistence.BaseEntity;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity()
@Table(name = "Comments")
@NoArgsConstructor()
@AllArgsConstructor
@Getter
@Setter
@Builder
public class Comment extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "parent_id", nullable = true, updatable = false)
  private Comment parent;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "thread_id", nullable = false, updatable = false)
  @NotNull
  private Thread thread;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "author_id", nullable = false, updatable = false)
  @NotNull
  private User author;

  @Column(nullable = false, columnDefinition = "TEXT", updatable = true)
  @NotBlank
  private String content;

  @Column(name = "reply_count", nullable = false)
  @Min(0)
  private int replyCount;

  @Column(nullable = false)
  private int score;

  @Column(name = "created_at", nullable = false)
  @CreationTimestamp
  private Instant createdAt;

  @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
  @Builder.Default
  private Set<Comment> replies = new HashSet<>();
}
