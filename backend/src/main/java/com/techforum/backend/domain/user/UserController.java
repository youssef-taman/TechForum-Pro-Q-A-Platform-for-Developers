package com.techforum.backend.domain.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @PutMapping("/{id}/suspend")
  public ResponseEntity<Void> suspend(@PathVariable String id) {
    userService.suspendUser(id);
    return ResponseEntity.noContent().build();
  }

  @DeleteMapping("/{id}")
  public ResponseEntity<Void> removeUser(@PathVariable String id) {
    userService.removeUser(id);
    return ResponseEntity.noContent().build();
  }
}
