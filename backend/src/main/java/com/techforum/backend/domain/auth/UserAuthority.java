package com.techforum.backend.domain.auth;

import com.techforum.backend.domain.user.enums.RoleType;
import org.jspecify.annotations.NonNull;
import org.springframework.security.core.GrantedAuthority;

public record UserAuthority(RoleType role) implements GrantedAuthority {

  @Override
  public @NonNull String getAuthority() {
    return "ROLE_" + role.name();
  }
}
