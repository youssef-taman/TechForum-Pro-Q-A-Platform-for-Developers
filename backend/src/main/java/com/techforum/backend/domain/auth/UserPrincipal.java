package com.techforum.backend.domain.auth;

import com.techforum.backend.domain.user.User;
import com.techforum.backend.domain.user.enums.RoleType;
import java.util.Collection;
import java.util.List;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Spring Security's {@link UserDetails} adapter over the domain {@link User} entity.
 *
 * <p>Maps the user's {@link RoleType} to a {@link UserAuthority} so Spring Security can enforce
 * role-based access control.
 *
 * <p><b>Important:</b> {@link #isAccountNonLocked()} is overridden to respect the {@code
 * isSuspended} flag on the {@link User} entity. A suspended user will be refused authentication by
 * Spring Security's {@code AbstractUserDetailsAuthenticationProvider}.
 */
public record UserPrincipal(User user) implements UserDetails {

  @Override
  public @NonNull Collection<? extends GrantedAuthority> getAuthorities() {
    UserAuthority userAuthority = new UserAuthority(user.getRole());
    return List.of(userAuthority);
  }

  @Override
  public @Nullable String getPassword() {
    return user.getPassword();
  }

  @Override
  public @NonNull String getUsername() {
    return user.getUsername();
  }

  /**
   * Returns {@code false} if the user's account has been administratively suspended, preventing
   * them from authenticating until the suspension is lifted.
   *
   * @return {@code true} if the account is active; {@code false} if suspended.
   */
  @Override
  public boolean isAccountNonLocked() {
    return !user.isSuspended();
  }
}
