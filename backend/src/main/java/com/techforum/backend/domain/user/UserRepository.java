package com.techforum.backend.domain.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

  /**
   * Finds an active user by their username or email.
   *
   * @param username The exact username to look up, lowercased.
   * @return An {@link Optional} containing the user if found.
   */
  @Query(
      """
          SELECT u FROM User u
          WHERE u.username = :identifier
             OR u.email = :identifier
      """)
  Optional<User> findByIdentifier(@Param("identifier") String identifier);

  /**
   * Returns {@code true} if any user exists with the given username OR the given email.
   *
   * <p>Used during registration to enforce uniqueness across both fields independently.
   * Both parameters should be pre-normalized to lowercase before calling, consistent
   * with how values are persisted, to ensure case-insensitive matching.
   *
   * <p><b>Note:</b> This is an OR check, a single existing user matching either field
   * is sufficient to return {@code true}.
   *
   * @param username The candidate username, lowercased.
   * @param email    The candidate email, lowercased.
   * @return {@code true} if a conflict exists on either field.
   */
  boolean existsByUsernameOrEmail(String username, String email);
}
