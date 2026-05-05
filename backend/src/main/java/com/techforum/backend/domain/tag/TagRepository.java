package com.techforum.backend.domain.tag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository()
public interface TagRepository extends JpaRepository<Tag, UUID> {

    boolean existsByNameIgnoreCase(String name);

    Optional<Tag> findByNameIgnoreCase(String name);

}
