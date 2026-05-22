package com.techforum.backend.domain.user;

import com.techforum.backend.common.exception.user.UserNotFoundException;
import com.techforum.backend.domain.user.dtos.UserDTO;
import com.techforum.backend.domain.user.mappers.UserMapper;
import jakarta.transaction.Transactional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserMapper userMapper;
  private final UserRepository userRepository;

  @Transactional
  public void suspendUser(UUID id) {
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    user.setSuspended(true);
  }

  @Transactional
  public void removeUser(UUID id) {
    User user = userRepository.findById(id).orElseThrow(UserNotFoundException::new);
    userRepository.delete(user);
  }

  public Page<UserDTO> listUsers(int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
    Page<User> userPage = userRepository.findAll(pageable);
    return userPage.map(userMapper::toDTO);
  }
}
