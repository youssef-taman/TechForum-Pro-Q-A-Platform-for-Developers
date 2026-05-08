package com.techforum.backend.common.persistence;

import com.fasterxml.uuid.Generators;
import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@MappedSuperclass
public abstract class BaseEntity {

  @Id
  @Column(name = "id", updatable = false, nullable = false)
  private UUID id;

  @PrePersist
  protected void generateV7UUID() {
    if (this.id == null) {
      this.id = Generators.timeBasedEpochRandomGenerator().generate();
    }
  }
}
