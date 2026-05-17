package com.techforum.backend.domain.interaction;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/interactions")
@RequiredArgsConstructor
public class InteractionController {
  private final InteractionService interactionService;

  @PostMapping("/bookmarks/{threadId}")
  public ResponseEntity<Void> addBookmark(
      @PathVariable UUID threadId, Authentication authentication) {
    interactionService.addBookmark(threadId, authentication);
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }

  @DeleteMapping("/bookmarks/{threadId}")
  public ResponseEntity<Void> deleteBookmark(
      @PathVariable UUID threadId, Authentication authentication) {
    interactionService.removeBookmark(threadId, authentication);
    return ResponseEntity.noContent().build();
  }
}
