package com.techforum.backend.domain.auth;

import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  @Override
  public @NonNull UserDetails loadUserByUsername(@NonNull String identifier)
      throws UsernameNotFoundException {
    User user =
        userRepository
            .findByIdentifier(identifier)
            .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));

    return new UserPrincipal(user);
  }
}
