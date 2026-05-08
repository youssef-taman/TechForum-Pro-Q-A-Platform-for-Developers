package com.techforum.backend.domain.user;

import com.techforum.backend.domain.user.enums.RoleType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

  @Query(
      """
                SELECT u FROM User u
                WHERE (u.username = :identifier)
                   OR (u.email = :identifier)
            """)
  Optional<User> findByIdentifier(@Param("identifier") String identifier);

  @Query(
      """
            SELECT u.isSuspended FROM User u
            WHERE (u.username = :identifier)
            OR (u.email = :identifier)
            """)
  Optional<Boolean> isSuspendedUser(@Param("identifier") String identifier);

  @Query(
      """
            SELECT u.role FROM User u
            WHERE (u.username = :identifier)
            OR (u.email = :identifier)
            """)
  Optional<RoleType> findRoleByIdentifier(@Param("identifier") String identifier);

  boolean existsByUsernameOrEmail(String username, String email);
}
