package com.techforum.backend.domain.auth.filter;

import com.techforum.backend.domain.auth.UserPrincipal;
import com.techforum.backend.domain.auth.jwt.JwtUtil;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.data.redis.RedisConnectionFailureException;
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

  // private static final String[] PUBLIC_PATH_PREFIXES = {
  //   "/auth/login", "/auth/register", "/swagger-ui", "/v3/api-docs"
  // };
  private static final String[] PUBLIC_PATH_PREFIXES = {
    "/auth/", "/swagger-ui/", "/v3/api-docs/", "/actuator/"
  };

  private final JwtUtil jwtUtil;
  private final StringRedisTemplate redisTemplate;
  private final UserDetailsService userDetailsService;

  /**
   * Intercepts incoming HTTP requests to validate JWT access tokens.
   *
   * <p>If a valid token is found and is not blacklisted, this filter extracts the user details and
   * injects the authentication context into the Spring Security Context Holder.
   *
   * @param request The incoming HTTP request.
   * @param response The outgoing HTTP response.
   * @param filterChain The Spring Security filter chain.
   * @throws ServletException If the request could not be handled.
   * @throws IOException If an input or output error is detected.
   */
  @Override
  protected void doFilterInternal(
      @NonNull HttpServletRequest request,
      @NonNull HttpServletResponse response,
      @NonNull FilterChain filterChain)
      throws ServletException, IOException {

    Optional<String> token = extractBearerToken(request);

    token.ifPresent(s -> authenticateRequest(request, s));

    filterChain.doFilter(request, response);
  }

  private Optional<String> extractBearerToken(HttpServletRequest request) {
    String authHeader = request.getHeader(AUTH_HEADER);

    if (authHeader == null || !authHeader.startsWith(BEARER_PREFIX)) {
      // Fallback: allow token via query parameter for transports that can't set headers
      // (SSE/EventSource)
      String param = request.getParameter("access_token");
      if (param != null && !param.isBlank()) {
        return Optional.of(param.trim());
      }
      return Optional.empty();
    }

    return Optional.of(authHeader.substring(BEARER_PREFIX.length()));
  }

  private void authenticateRequest(HttpServletRequest request, String token) {
    String requestUri = request.getRequestURI();

    try {
      if (isBlacklisted(token, requestUri) || isAlreadyAuthenticated()) {
        return;
      }

      String username = jwtUtil.extractUsername(token);

      if (username == null) {
        log.warn(
            "JWT token present but username could not be extracted — possible malformed token. URI: {}",
            requestUri);
        return;
      }

      UserPrincipal userPrincipal = (UserPrincipal) userDetailsService.loadUserByUsername(username);

      if (!userPrincipal.isAccountNonLocked()) {
        log.warn("Blocked JWT for suspended user: {}. URI: {}", username, requestUri);
        return;
      }

      if (!jwtUtil.isTokenValid(token, userPrincipal)) {
        log.warn("JWT claims validation failed for user: {}. URI: {}", username, requestUri);
        return;
      }

      SecurityContextHolder.getContext()
          .setAuthentication(buildAuthenticationToken(userPrincipal, request));

    } catch (JwtException e) {
      log.warn("Rejected Invalid JWT: {}", e.getMessage());
    }
  }

  private boolean isBlacklisted(String token, String requestUri) {
    try {
      boolean blacklisted = Boolean.TRUE.equals(redisTemplate.hasKey(BLACKLIST_PREFIX + token));

      if (blacklisted) {
        log.warn("Blocked request using blacklisted token. URI: {}", requestUri);
      }

      return blacklisted;
    } catch (RedisConnectionFailureException e) {
      log.error(
          "CRITICAL: Redis is unreachable. Skipping JWT authentication for safety. URI: {}",
          requestUri);
      return true;
    }
  }

  private boolean isAlreadyAuthenticated() {
    return SecurityContextHolder.getContext().getAuthentication() != null;
  }

  private UsernamePasswordAuthenticationToken buildAuthenticationToken(
      UserPrincipal userPrincipal, HttpServletRequest request) {
    UsernamePasswordAuthenticationToken authToken =
        new UsernamePasswordAuthenticationToken(
            userPrincipal, null, userPrincipal.getAuthorities());

    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
    return authToken;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getServletPath();

    for (String publicPathPrefix : PUBLIC_PATH_PREFIXES) {
      if (path.startsWith(publicPathPrefix)) {
        return true;
      }
    }

    return false;
  }
}
