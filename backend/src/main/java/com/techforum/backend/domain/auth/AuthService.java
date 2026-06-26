package com.techforum.backend.domain.auth;

import com.techforum.backend.common.exception.ConflictException;
import com.techforum.backend.common.exception.InfrastructureException;
import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.auth.dto.AuthActionResponseDTO;
import com.techforum.backend.domain.auth.dto.AuthResponseDTO;
import com.techforum.backend.domain.auth.dto.ChangePasswordRequestDTO;
import com.techforum.backend.domain.auth.dto.EmailVerificationConfirmDTO;
import com.techforum.backend.domain.auth.dto.EmailVerificationRequestDTO;
import com.techforum.backend.domain.auth.dto.LoginRequestDTO;
import com.techforum.backend.domain.auth.dto.PasswordResetConfirmDTO;
import com.techforum.backend.domain.auth.dto.PasswordResetRequestDTO;
import com.techforum.backend.domain.auth.dto.RegisterRequestDTO;
import com.techforum.backend.domain.auth.jwt.JwtUtil;
import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import com.techforum.backend.domain.user.enums.RoleType;
import io.jsonwebtoken.JwtException;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

  private final StringRedisTemplate redisTemplate;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final AuthenticationManager authenticationManager;
  private final JwtUtil jwtUtil;

  private static final String PASSWORD_RESET_PREFIX = "auth:password-reset:";
  private static final String EMAIL_VERIFICATION_PREFIX = "auth:email-verification:";
  private static final long PASSWORD_RESET_TTL_MINUTES = 30L;
  private static final long EMAIL_VERIFICATION_TTL_HOURS = 24L;

  /**
   * Registers a new user with the provided credentials.
   *
   * <p>Username and email are checked for uniqueness in a single DB call (case-insensitive). The
   * password is BCrypt-encoded before persistence. A JWT token is generated immediately, so the
   * user is logged in upon registration.
   *
   * @param request Validated registration payload (username, email, password).
   * @return {@link AuthResponseDTO} containing the JWT token and basic user profile.
   * @throws ConflictException if the username or email already exists.
   */
  public AuthResponseDTO register(RegisterRequestDTO request) {
    String normalizedUsername = request.username().toLowerCase();
    String normalizedEmail = request.email().toLowerCase();

    if (userRepository.existsByUsernameOrEmail(normalizedUsername, normalizedEmail)
        || userRepository.existsByUsernameOrEmail(normalizedEmail, normalizedUsername)) {
      throw new ConflictException("User already exists");
    }

    User newUser =
        User.builder()
            .username(normalizedUsername.trim())
            .email(normalizedEmail.trim())
            .password(passwordEncoder.encode(request.password()))
            .createdAt(Instant.now())
            .isSuspended(false)
            .isEmailVerified(false)
            .role(RoleType.USER)
            .build();

    try {
      userRepository.save(newUser);
    } catch (DataIntegrityViolationException e) {
      throw new ConflictException("User already exists");
    }

    String jwtToken = jwtUtil.generateToken(newUser.getUsername());

    return AuthResponseDTO.builder()
        .username(newUser.getUsername())
        .email(newUser.getEmail())
        .role(RoleType.USER.name())
        .accessToken(jwtToken)
        .build();
  }

  /**
   * Authenticates a user using their username or email and password.
   *
   * <p>Delegates credential verification to Spring Security's {@link AuthenticationManager}, which
   * internally invokes {@link DatabaseUserDetailsService}. On success, a new JWT token is generated
   * — any previously issued tokens remain valid until they expire or are explicitly revoked via
   * {@link #logout(String)}.
   *
   * @param request Login payload containing an identifier (username or email) and password.
   * @return {@link AuthResponseDTO} containing the JWT token and basic user profile.
   * @throws org.springframework.security.core.AuthenticationException if authentication fails.
   */
  public AuthResponseDTO login(LoginRequestDTO request) {
    Authentication authentication =
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.identifier(), request.password()));

    UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

    assert userPrincipal != null;
    User user = userPrincipal.user();

    String jwtToken = jwtUtil.generateToken(user.getUsername());

    return AuthResponseDTO.builder()
        .username(user.getUsername())
        .email(user.getEmail())
        .role(user.getRole().name())
        .accessToken(jwtToken)
        .build();
  }

  public AuthActionResponseDTO requestPasswordReset(PasswordResetRequestDTO request) {
    User user = findUser(request.identifier());
    if (user == null) {
      return AuthActionResponseDTO.builder()
          .message("If an account exists, a reset token has been generated.")
          .build();
    }

    String token = UUID.randomUUID().toString();
    storeToken(
        PASSWORD_RESET_PREFIX + token,
        user.getUsername(),
        PASSWORD_RESET_TTL_MINUTES,
        TimeUnit.MINUTES);

    return AuthActionResponseDTO.builder()
        .message("Password reset token generated.")
        .token(token)
        .build();
  }

  public AuthActionResponseDTO confirmPasswordReset(PasswordResetConfirmDTO request) {
    String username = consumeToken(PASSWORD_RESET_PREFIX + request.token());
    User user =
        userRepository
            .findByIdentifier(username)
            .orElseThrow(() -> new ConflictException("Invalid or expired reset token"));

    user.setPassword(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);

    return AuthActionResponseDTO.builder().message("Password updated successfully.").build();
  }

  public AuthActionResponseDTO requestEmailVerification(EmailVerificationRequestDTO request) {
    User user = findUser(request.identifier());
    if (user == null) {
      return AuthActionResponseDTO.builder()
          .message("If an account exists, a verification token has been generated.")
          .build();
    }

    if (user.isEmailVerified()) {
      return AuthActionResponseDTO.builder().message("Email is already verified.").build();
    }

    String token = UUID.randomUUID().toString();
    storeToken(
        EMAIL_VERIFICATION_PREFIX + token,
        user.getUsername(),
        EMAIL_VERIFICATION_TTL_HOURS,
        TimeUnit.HOURS);

    return AuthActionResponseDTO.builder()
        .message("Verification token generated.")
        .token(token)
        .build();
  }

  public AuthActionResponseDTO confirmEmailVerification(EmailVerificationConfirmDTO request) {
    String username = consumeToken(EMAIL_VERIFICATION_PREFIX + request.token());
    User user =
        userRepository
            .findByIdentifier(username)
            .orElseThrow(() -> new ConflictException("Invalid or expired verification token"));

    user.setEmailVerified(true);
    userRepository.save(user);

    return AuthActionResponseDTO.builder().message("Email verified successfully.").build();
  }

  @Transactional
  public void changePassword(ChangePasswordRequestDTO request, Authentication authentication) {
    String username = authentication.getName();

    // Fetch user from DB. (Adjust findByUsername if your repo uses something else, like findById)
    User user =
        userRepository
            .findByUsername(username)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

    // 1. Verify the current password is correct
    if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
      throw new IllegalArgumentException("Current password is incorrect");
    }

    // 2. Encode the new password and update
    user.setPassword(passwordEncoder.encode(request.newPassword()));
    userRepository.save(user);

    /*
     * SECURITY NOTE (Optional but recommended):
     * If you want to force the user to log in again with their new password,
     * you can blacklist their current token here just like you did in logout():
     *
     * String token = ((JwtAuthenticationToken) authentication).getToken().getTokenValue();
     * long remainingTime = jwtUtil.extractExpiration(token).getTime() - System.currentTimeMillis();
     * if (remainingTime > 0) {
     *     redisTemplate.opsForValue().set("blacklist:" + token, "revoked", remainingTime, TimeUnit.MILLISECONDS);
     * }
     */
  }

  /**
   * Revokes a JWT token by placing it on a Redis blacklist.
   *
   * <p>The token is stored in Redis with a TTL equal to its remaining validity period, ensuring the
   * blacklist entry is automatically cleaned up upon natural token expiry. This method is
   * intentionally fault-tolerant: invalid or already-expired tokens are silently ignored, making
   * logout effectively idempotent.
   *
   * @param authorizationHeader Header containing the raw JWT string to revoke.
   */
  public void logout(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      return;
    }

    String token = authorizationHeader.substring(7);
    long remainingTime;

    try {
      remainingTime = jwtUtil.extractExpiration(token).getTime() - System.currentTimeMillis();
    } catch (JwtException | IllegalArgumentException e) {
      log.info("Logout requested for an already invalid or expired token.");
      return;
    }

    if (remainingTime > 0) {
      try {
        redisTemplate
            .opsForValue()
            .set("blacklist:" + token, "revoked", remainingTime, TimeUnit.MILLISECONDS);
      } catch (DataAccessException e) {
        log.error("CRITICAL: Failed to write to Redis blacklist during logout.");
        throw new InfrastructureException("Logout service is temporarily unavailable.", e);
      }
    }
  }

  private User findUser(String identifier) {
    if (identifier == null) {
      return null;
    }

    return userRepository.findByIdentifier(identifier.trim().toLowerCase()).orElse(null);
  }

  private void storeToken(String key, String value, long ttl, TimeUnit unit) {
    try {
      redisTemplate.opsForValue().set(key, value, ttl, unit);
    } catch (DataAccessException e) {
      throw new InfrastructureException(
          "Authentication token service is temporarily unavailable.", e);
    }
  }

  private String consumeToken(String key) {
    String value = redisTemplate.opsForValue().get(key);
    if (value == null) {
      throw new ConflictException("Invalid or expired token");
    }

    redisTemplate.delete(key);
    return value;
  }
}
