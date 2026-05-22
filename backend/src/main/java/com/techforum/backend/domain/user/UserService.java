package com.techforum.backend.domain.user;

import com.techforum.backend.common.exception.user.UserNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository userRepository;

  @Transactional
  public void suspendUser(String id) {
    User user = userRepository.findByIdentifier(id).orElseThrow(UserNotFoundException::new);
    user.setSuspended(true);
  }

  @Transactional
  public void removeUser(String id) {
    User user = userRepository.findByIdentifier(id).orElseThrow(UserNotFoundException::new);
    userRepository.delete(user);
  }
}
