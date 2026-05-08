package com.techforum.backend.domain.thread;

import com.techforum.backend.common.persistence.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity()
@Table(name = "Thread_Embeddings")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class ThreadEmbedding extends BaseEntity {

  @MapsId
  @OneToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "thread_id")
  private Thread thread;

  @Column(columnDefinition = "vector(768)", nullable = false, updatable = true)
  @JdbcTypeCode(SqlTypes.VECTOR)
  @NotNull
  private float[] embedding;
}
