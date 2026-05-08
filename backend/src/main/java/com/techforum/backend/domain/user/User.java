package com.techforum.backend.domain.user;

import com.techforum.backend.common.persistence.BaseEntity;
import com.techforum.backend.domain.user.enums.RoleType;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity(name = "User")
@Table(name = "Users")
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class User extends BaseEntity {

  @Column(length = 30, nullable = false, unique = true)
  @Size(min = 3, max = 30)
  @NotBlank
  private String username;

  @Column(length = 255, nullable = false, unique = true)
  @Size(max = 255)
  @Email
  private String email;

  @Column(length = 255, nullable = false)
  @Size(min = 8, max = 255)
  @NotBlank
  private String password;

  @Column(nullable = false)
  @JdbcTypeCode(SqlTypes.NAMED_ENUM)
  @NotNull
  private RoleType role;

  @Column(name = "created_at", nullable = false, updatable = false)
  @CreationTimestamp
  private Instant createdAt;

  @Column(name = "is_suspended", nullable = false)
  @Builder.Default
  private boolean isSuspended = false;
}
