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

  /**
   * Finds an active user by their username or email, completely ignoring case.
   *
   * @param identifier The username or email to look up.
   * @return An {@link Optional} containing the user if found.
   */
  @Query(
      """
                SELECT u FROM User u
                WHERE (u.username = LOWER(:identifier))
                   OR (u.email = LOWER(:identifier))
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

  /**
   * Returns {@code true} if any user exists with the given username OR the given email.
   *
   * <p>Used during registration to enforce uniqueness across both fields independently. Matching is
   * performed case-insensitively at the query level, so existing mixed-case persisted values are
   * still detected correctly.
   *
   * <p><b>Note:</b> This is an OR check, a single existing user matching either field is enough to
   * return {@code true}.
   *
   * @param username The candidate username.
   * @param email The candidate email.
   * @return {@code true} if a conflict exists on either field.
   */
  @Query(
      """
          SELECT COUNT(u) > 0 FROM User u
          WHERE u.username = LOWER(:username)
             OR u.email = LOWER(:email)
      """)
  boolean existsByUsernameOrEmail(@Param("username") String username, @Param("email") String email);
}
