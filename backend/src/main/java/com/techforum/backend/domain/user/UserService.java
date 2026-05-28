package com.techforum.backend.domain.user;

import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.user.dtos.UserDTO;
import com.techforum.backend.domain.user.enums.RoleType;
import com.techforum.backend.domain.user.mappers.UserMapper;
import jakarta.transaction.Transactional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserMapper userMapper;
  private final UserRepository userRepository;

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
  }

  @Transactional
  public void removeUser(UUID id) {
    verifyCurrentUserCanManageUsers();
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    verifyTargetUserCanBeManaged(user);
    userRepository.delete(user);
  }

  public Page<UserDTO> listUsers(int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
    return userRepository.findAll(pageable).map(userMapper::toDTO);
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
}
