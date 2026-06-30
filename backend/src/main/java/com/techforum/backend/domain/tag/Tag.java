package com.techforum.backend.domain.tag;

import com.techforum.backend.common.persistence.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Entity(name = "Tag")
@Table(name = "Tags")
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
@Builder
public class Tag extends BaseEntity {

  @Column(length = 30, nullable = false, unique = true)
  @NotBlank
  @Size(max = 30)
  private String name;
}
