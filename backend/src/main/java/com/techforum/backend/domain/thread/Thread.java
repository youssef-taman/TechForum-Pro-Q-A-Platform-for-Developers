package com.techforum.backend.domain.thread;

import com.techforum.backend.common.persistence.BaseEntity;
import com.techforum.backend.domain.comment.Comment;
import com.techforum.backend.domain.tag.Tag;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import com.techforum.backend.domain.user.User;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Formula;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity(name = "Thread")
@Table(name = "Threads")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class Thread extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User author;

    @Column(length = 255, nullable = false, updatable = true)
    @Size(max = 255)
    @NotBlank
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false, updatable = true)
    @NotBlank
    private String body;

    @Column(nullable = false, updatable = true)
    @NotNull
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    private ThreadStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    @CreationTimestamp
    private Instant createdAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "thread_tags",
            joinColumns = @JoinColumn(name = "thread_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    private Set<Tag> tags = new HashSet<>();

    @OneToMany(mappedBy = "thread", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Comment> comments = new HashSet<>();

    @Formula("(SELECT COUNT(c.id) FROM Comments c WHERE c.thread_id = id)")
    private int numberComments;
}
