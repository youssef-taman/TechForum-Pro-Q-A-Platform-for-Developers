package com.techforum.backend.domain.auth;

import com.techforum.backend.domain.auth.filter.JwtAuthFilter;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Central Spring Security configuration for the TechForum API.
 *
 * <p>Configures a stateless, JWT-based security model:
 *
 * <ul>
 *   <li>Sessions are never created (STATELESS policy).
 *   <li>CSRF protection is disabled — safe for stateless REST APIs that don't use cookies for auth.
 *   <li>CORS is restricted to the local frontend dev server ({@code http://localhost:5173}). Update
 *       {@link #corsConfigurationSource()} with production origins before deployment.
 *   <li>{@link JwtAuthFilter} runs before Spring's built-in {@link
 *       UsernamePasswordAuthenticationFilter} to inject authentication from the JWT.
 * </ul>
 *
 * <p><b>Public endpoints:</b> {@code /auth/**}, {@code /actuator/**}, Swagger UI paths, and {@code
 * /error}. All other endpoints require a valid JWT.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  private static final String[] SWAGGER_WHITELIST = {
    "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html"
  };
  private static final String[] ACTUATOR_WHITELIST = {"/actuator/**"};
  private static final List<String> ADMIN_ALLOWED_IPS =
      List.of("127.0.0.1", "0:0:0:0:0:0:0:1", "45.241.81.130", "156.217.78.190", "156.217.7.141");
  private final JwtAuthFilter jwtAuthFilter;
  private final String allowedOrigins;

  public SecurityConfig(
      JwtAuthFilter jwtAuthFilter,
      @Value("${application.cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
    this.jwtAuthFilter = jwtAuthFilter;
    this.allowedOrigins = allowedOrigins;
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration config)
      throws Exception {
    return config.getAuthenticationManager();
  }

  @Bean
  @Order(1)
  public SecurityFilterChain securityFilterChain(HttpSecurity httpSecurity) throws Exception {
    return httpSecurity
        .securityMatcher("/**")
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/auth/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/threads/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/comments/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/tags/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/users/{username}")
                    .permitAll()
                    .requestMatchers(ACTUATOR_WHITELIST)
                    .permitAll()
                    .requestMatchers(SWAGGER_WHITELIST)
                    .permitAll()
                    .requestMatchers("/error")
                    .permitAll()
                    .requestMatchers("/admin/**")
                    .access(
                        (authentication, context) -> {
                          HttpServletRequest request = context.getRequest();
                          boolean isAllowed =
                              ADMIN_ALLOWED_IPS.stream()
                                  .anyMatch(ip -> new IpAddressMatcher(ip).matches(request));
                          if (!isAllowed) {
                            throw new AccessDeniedException(
                                "Admin access restricted to authorized developer IPs only.");
                          }
                          return new AuthorizationDecision(true);
                        })
                    .anyRequest()
                    .authenticated())
        .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(List.of(allowedOrigins.split(",")));

    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
