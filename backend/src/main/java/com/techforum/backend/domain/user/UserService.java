package com.techforum.backend.domain.user;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository userRepository;

  @Transactional
  public void suspendUser(String id) {
    // TODO: Change to Resource Not Found Exception
    User user = userRepository.findByIdentifier(id)
        .orElseThrow(() -> new UsernameNotFoundException("User Id not found"));
    user.setSuspended(true);
  }

  @Transactional
  public void removeUser(String id) {
    // TODO: Change to Resource Not Found Exception
    User user = userRepository.findByIdentifier(id)
        .orElseThrow(() -> new UsernameNotFoundException("User Id not found"));
    userRepository.delete(user);
  }
}
