package com.techforum.backend.domain.auth.jwt;

import com.techforum.backend.domain.auth.UserPrincipal;
import com.techforum.backend.domain.auth.filter.JwtAuthFilter;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Utility component for generating, parsing, and validating JSON Web Tokens (JWTs).
 *
 * <p>Tokens are signed using HMAC-SHA and a Base64-encoded secret key. The signing key and
 * expiration time are injected from application properties:
 *
 * <ul>
 *   <li>{@code application.security.jwt.secret-key} — Base64-encoded HMAC secret (min 256 bits
 *       recommended for HS256).
 *   <li>{@code application.security.jwt.expiration-time} — Token lifetime in milliseconds.
 * </ul>
 *
 * <p><b>Security note:</b> The secret key must never be committed to source control. Use
 * environment variables or a secrets manager (e.g., AWS Secrets Manager, Vault) in production.
 *
 * @see JwtAuthFilter
 */
@Component
public class JwtUtil {

  @Value("${application.security.jwt.secret-key}")
  private String SECRET_KEY;

  @Value("${application.security.jwt.expiration-time}")
  private long EXPIRATION_TIME;

  /** Extracts the username (subject) from the JWT token. */
  public String extractUsername(String token) {
    return extractClaim(token, Claims::getSubject);
  }

  /** Extracts the expiration date from the token. */
  public Date extractExpiration(String token) {
    return extractClaim(token, Claims::getExpiration);
  }

  /** Extracts a specific claim from the JWT token using a resolver function. */
  public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
    return claimsResolver.apply(extractAllClaims(token));
  }

  /** Parses the JWT to extract all internal claims. Uses the modern JJWT parser builder. */
  public Claims extractAllClaims(String token) {
    return Jwts.parser().verifyWith(getSignInKey()).build().parseSignedClaims(token).getPayload();
  }

  /** Generates a token for the given UserDetails without extra claims. */
  public String generateToken(String username) {
    return generateToken(new HashMap<>(), username);
  }

  /** Generates a token with extra custom claims. */
  private String generateToken(Map<String, Object> claims, String username) {
    return Jwts.builder()
        .claims(claims)
        .subject(username)
        .issuedAt(new Date(System.currentTimeMillis()))
        .expiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
        .signWith(getSignInKey())
        .compact();
  }

  /** Validates the token by checking if the username matches and if the token is expired. */
  public boolean isTokenValid(String token, UserPrincipal userPrincipal) {
    final String username = extractUsername(token);
    return (Objects.equals(username, userPrincipal.getUsername()) && !isTokenExpired(token));
  }

  /** Checks if the current token has passed its expiration date. */
  public boolean isTokenExpired(String token) {
    return extractExpiration(token).before(new Date());
  }

  /** Decodes the Base64 secret key and generates the cryptographic signing key. */
  private SecretKey getSignInKey() {
    byte[] keyBytes = Decoders.BASE64.decode(SECRET_KEY);
    return Keys.hmacShaKeyFor(keyBytes);
  }
}
