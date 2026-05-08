package com.techforum.backend.domain.tag;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository()
public interface TagRepository extends JpaRepository<Tag, UUID> {

  boolean existsByNameIgnoreCase(String name);

  Optional<Tag> findByNameIgnoreCase(String name);
}
