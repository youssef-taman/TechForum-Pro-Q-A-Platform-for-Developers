package com.techforum.backend.domain.interaction;

import com.techforum.backend.common.persistence.BaseEntity;
import com.techforum.backend.domain.thread.Thread;
import com.techforum.backend.domain.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(
    name = "Bookmarks",
    uniqueConstraints = {@UniqueConstraint(columnNames = {"user_id", "thread_id"})})
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class Bookmark extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "thread_id", nullable = false, updatable = false)
  @NotNull
  private Thread thread;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false, updatable = false)
  @NotNull
  private User user;

  @Column(name = "created_at", updatable = false, nullable = false)
  @CreationTimestamp
  private Instant createdAt;
}
