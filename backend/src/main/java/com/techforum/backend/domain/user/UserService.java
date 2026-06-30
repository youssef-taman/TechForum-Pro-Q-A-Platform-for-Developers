package com.techforum.backend.domain.user;

import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.auth.jwt.JwtUtil;
import com.techforum.backend.domain.comment.CommentRepository;
import com.techforum.backend.domain.thread.ThreadRepository;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import com.techforum.backend.domain.user.dtos.AdminMetricsDTO;
import com.techforum.backend.domain.user.dtos.UserDTO;
import com.techforum.backend.domain.user.enums.RoleType;
import com.techforum.backend.domain.user.mappers.UserMapper;
import jakarta.transaction.Transactional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
  private final JwtUtil jwtUtil;
  private final StringRedisTemplate redisTemplate;
  private final UserMapper userMapper;
  private final UserRepository userRepository;
  private final ThreadRepository threadRepository;
  private final CommentRepository commentRepository;

  @Transactional
  public void promoteUser(UUID id, RoleType role) {
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);

    if (user.getRole().ordinal() <= role.ordinal()) {
      throw new IllegalStateException("Cannot promote to the same or a lower role.");
    }

    user.setRole(role);
  }

  @Transactional
  public void demoteModerator(UUID id) {
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);

    if (user.getRole() == RoleType.ADMIN) {
      throw new IllegalStateException("Cannot demote an administrator.");
    }

    if (user.getRole() == RoleType.USER) {
      throw new IllegalStateException("User is already at the base role.");
    }

    user.setRole(RoleType.USER);
  }

  @Transactional
  public void suspendUser(UUID id) {
    verifyCurrentUserCanManageUsers();
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    verifyTargetUserCanBeManaged(user);
    user.setSuspended(true);
    revokeUserToken(user.getUsername());
  }

  @Transactional
  public void unsuspendUser(UUID userId) {
    verifyCurrentUserCanManageUsers();
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new UserNotFoundException("User not found"));
    verifyTargetUserCanBeManaged(user);
    user.setSuspended(false);
  }

  @Transactional
  public void removeUser(UUID id) {
    verifyCurrentUserCanManageUsers();
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    verifyTargetUserCanBeManaged(user);
    revokeUserToken(user.getUsername());
    userRepository.delete(user);
  }

  public Page<UserDTO> listUsers(int page, int size, String q) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());

    if (q == null || q.isBlank()) {
      return userRepository.findAll(pageable).map(userMapper::toDTO);
    }

    // search by username or email (case-insensitive, substring match)
    return userRepository
        .findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(q, q, pageable)
        .map(userMapper::toDTO);
  }

  public AdminMetricsDTO getMetrics() {
    long open = threadRepository.countByStatus(ThreadStatus.OPEN);
    long resolved = threadRepository.countByStatus(ThreadStatus.RESOLVED);
    long closed = threadRepository.countByStatus(ThreadStatus.CLOSED);
    long pending = threadRepository.countByStatus(ThreadStatus.PENDING);
    long total = open + resolved + closed + pending;
    double resolutionRate = total > 0 ? (double) resolved / total * 100 : 0;

    return new AdminMetricsDTO(
        userRepository.count(),
        userRepository.countByIsSuspendedTrue(),
        open,
        pending,
        resolved,
        closed,
        commentRepository.count(),
        Math.round(resolutionRate * 10.0) / 10.0);
  }

  private void verifyCurrentUserCanManageUsers() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

    if (authentication == null || authentication.getAuthorities() == null) {
      throw new AccessDeniedException("Insufficient permissions to manage users.");
    }

    boolean canManageUsers =
        authentication.getAuthorities().stream()
            .map(authority -> authority.getAuthority().replaceFirst("^ROLE_", ""))
            .map(this::toRoleType)
            .anyMatch(RoleType::isCanDeleteOrSuspend);

    if (!canManageUsers) {
      throw new AccessDeniedException("Insufficient permissions to manage users.");
    }
  }

  private RoleType toRoleType(String roleName) {
    try {
      return RoleType.valueOf(roleName);
    } catch (IllegalArgumentException ex) {
      return RoleType.USER;
    }
  }

  private void verifyTargetUserCanBeManaged(User user) {
    if (!user.getRole().isCanBeSuspendedOrDeleted()) {
      throw new AccessDeniedException("This user cannot be suspended or deleted.");
    }
  }

  private void revokeUserToken(String username) {
    String token = redisTemplate.opsForValue().get("user-token:" + username);
    if (token != null) {
      long remainingTime = jwtUtil.extractExpiration(token).getTime() - System.currentTimeMillis();
      if (remainingTime > 0) {
        redisTemplate
            .opsForValue()
            .set("blacklist:" + token, "revoked", remainingTime, TimeUnit.MILLISECONDS);
      }
      redisTemplate.delete("user-token:" + username);
    }
  }
}
