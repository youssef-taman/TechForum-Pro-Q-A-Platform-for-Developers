package com.techforum.backend.domain.user;

import com.techforum.backend.domain.user.dtos.UserDTO;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
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

  @GetMapping
  public ResponseEntity<Page<UserDTO>> listUsers(
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "10") @Positive int size) {
    Page<UserDTO> userPage = userService.listUsers(page, size);
    return ResponseEntity.ok(userPage);
  }
}
