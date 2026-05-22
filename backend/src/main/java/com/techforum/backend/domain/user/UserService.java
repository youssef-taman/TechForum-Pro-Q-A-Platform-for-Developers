package com.techforum.backend.domain.user;

import com.techforum.backend.domain.user.dtos.UserDTO;
import com.techforum.backend.domain.user.mappers.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
  private final UserRepository userRepository;
  private final UserMapper userMapper;

  public Page<UserDTO> listUsers(int page, int size) {
    Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
    Page<User> userPage = userRepository.findAll(pageable);
    return userPage.map(userMapper::toDTO);
  }
}
