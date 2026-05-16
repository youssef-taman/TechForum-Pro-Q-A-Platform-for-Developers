package com.techforum.backend.domain.user;

import com.techforum.backend.domain.user.enums.RoleType;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository userRepository;

  @Transactional
  public void promoteUser(String id, RoleType role) {
    User user = userRepository.findByIdentifier(id)
        .orElseThrow(() -> new UsernameNotFoundException("User Id not found"));

    // TODO: check if upgrading or downgrading
    user.setRole(role);
  }

  @Transactional
  public void demoteModerator(String id) {
    User user = userRepository.findByIdentifier(id)
        .orElseThrow(() -> new UsernameNotFoundException("User Id not found"));

    if (user.getRole() == RoleType.ADMIN) {
      throw new IllegalStateException("Cannot demote an administrator.");
    }

    if (user.getRole() == RoleType.USER) {
      throw new IllegalStateException("User is already at the base role.");
    }

    user.setRole(RoleType.USER);
  }
}
