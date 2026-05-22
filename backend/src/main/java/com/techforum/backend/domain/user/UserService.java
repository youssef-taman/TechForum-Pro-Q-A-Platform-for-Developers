package com.techforum.backend.domain.user;

import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.user.dtos.UserDTO;
import com.techforum.backend.domain.user.enums.RoleType;
import com.techforum.backend.domain.user.mappers.UserMapper;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserMapper userMapper;
  private final UserRepository userRepository;

  @Transactional
  public void promoteUser(UUID id, RoleType role) {
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);

    if (user.getRole().ordinal() >= role.ordinal()) {
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
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    verifyTargetUserCanBeManaged(user);
    user.setSuspended(true);
  }

  @Transactional
  public void removeUser(UUID id) {
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    verifyTargetUserCanBeManaged(user);
    userRepository.delete(user);
  }

  public Page<UserDTO> listUsers(int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
    return userRepository.findAll(pageable).map(userMapper::toDTO);
  }

  private void verifyTargetUserCanBeManaged(User user) {
    if (!user.getRole().isCanBeSuspendedOrDeleted()) {
      throw new AccessDeniedException("This user cannot be suspended or deleted.");
    }
  }
}
