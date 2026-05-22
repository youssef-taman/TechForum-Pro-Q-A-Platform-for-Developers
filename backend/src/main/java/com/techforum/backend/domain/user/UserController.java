package com.techforum.backend.domain.user;

import com.techforum.backend.domain.user.dtos.UserDTO;
import com.techforum.backend.domain.user.enums.RoleType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
  private final UserService userService;

  @PostMapping("/{id}/promote")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> promoteUser(
      @PathVariable UUID id, @RequestBody PromotionRequest request) {
    userService.promoteUser(id, request.role());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/demote")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> demoteModerator(@PathVariable UUID id) {
    userService.demoteModerator(id);
    return ResponseEntity.noContent().build();
  }

  @PatchMapping("/{id}/suspend")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> suspend(@PathVariable UUID id) {
    userService.suspendUser(id);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> removeUser(@PathVariable UUID id) {
    userService.removeUser(id);
    return ResponseEntity.noContent().build();
  }

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Page<UserDTO>> listUsers(
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "10") @Positive int size) {
    Page<UserDTO> userPage = userService.listUsers(page, size);
    return ResponseEntity.ok(userPage);
  }

  public record PromotionRequest(RoleType role) {}
}
