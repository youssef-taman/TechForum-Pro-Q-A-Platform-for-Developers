package com.techforum.backend.domain.auth.filter;

import com.techforum.backend.domain.auth.jwt.JwtUtil;
import com.techforum.backend.domain.auth.UserPrincipal;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

  private static final String AUTH_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";
  private static final String BLACKLIST_PREFIX = "blacklist:";

  private final JwtUtil jwtUtil;
  private final StringRedisTemplate redisTemplate;
  private final UserDetailsService userDetailsService;

  /**
   * Intercepts incoming HTTP requests to validate JWT access tokens.
   *
   * <p>If a valid token is found and is not blacklisted (e.g., from a logged-out session), this
   * filter extracts the user details and injects the authentication context into the Spring
   * Security Context Holder.
   *
   * @param request The incoming HTTP request.
   * @param response The outgoing HTTP response.
   * @param filterChain The Spring Security filter chain.
   * @throws ServletException If the request could not be handled.
   * @throws IOException If an input or output error is detected.
   */
  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    final String authHeader = request.getHeader(AUTH_HEADER);

    // Guard 1: Ignore requests without a properly formatted Bearer token
    if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
      filterChain.doFilter(request, response);
      return;
    }

    final String jwtToken = authHeader.substring(BEARER_PREFIX.length());

    try {
      // Guard 2: Ignore tokens that have been revoked via logout
      if (Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + jwtToken))) {
        log.warn("Blocked request using blacklisted token. URI: {}", request.getRequestURI());
        filterChain.doFilter(request, response);
        return;
      }

      final String username = jwtUtil.extractUsername(jwtToken);

      // Guard 3a: Log and skip if username could not be extracted from a present token
      if (username == null) {
        log.warn(
            "JWT token present but username could not be extracted — possible malformed token. URI: {}",
            request.getRequestURI());
        filterChain.doFilter(request, response);
        return;
      }

      // Guard 3b: Skip if the user is already authenticated in this request cycle
      if (SecurityContextHolder.getContext().getAuthentication() != null) {
        filterChain.doFilter(request, response);
        return;
      }

      UserPrincipal userPrincipal =
          (UserPrincipal) this.userDetailsService.loadUserByUsername(username);

      // Guard 4: Validate the claims against the user details
      if (!jwtUtil.isTokenValid(jwtToken, userPrincipal)) {
        log.warn(
            "JWT claims validation failed for user: {}. URI: {}",
            username,
            request.getRequestURI());
        filterChain.doFilter(request, response);
        return;
      }

      // Success: All checks passed, set the authentication state
      UsernamePasswordAuthenticationToken authToken =
          new UsernamePasswordAuthenticationToken(
              userPrincipal, null, userPrincipal.getAuthorities());

      authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
      SecurityContextHolder.getContext().setAuthentication(authToken);

    } catch (JwtException e) {
      log.warn("Rejected Invalid JWT: {}", e.getMessage());
    }

    filterChain.doFilter(request, response);
  }
}
