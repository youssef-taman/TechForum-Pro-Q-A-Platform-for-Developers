package com.techforum.backend.domain.user;

import com.techforum.backend.domain.user.enums.RoleType;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
  private final UserService userService;

  @PostMapping("/{id}/promote")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> promoteUser(
      @PathVariable String id,
      @RequestParam RoleType role) {

    userService.promoteUser(id, role);
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/{id}/demote")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> demoteModerator(@PathVariable String id) {
    userService.demoteModerator(id);
    return ResponseEntity.noContent().build();
  }
}