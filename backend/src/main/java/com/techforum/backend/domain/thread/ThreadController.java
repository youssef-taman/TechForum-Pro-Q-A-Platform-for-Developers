package com.techforum.backend.domain.thread;

import com.techforum.backend.domain.thread.dtos.ThreadCreateDTO;
import com.techforum.backend.domain.thread.dtos.ThreadDTO;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/threads")
@RequiredArgsConstructor
public class ThreadController {

  private final ThreadService threadService;

  @PostMapping("/")
  public ResponseEntity<ThreadDTO> createThread(
      @Valid @RequestBody ThreadCreateDTO threadCreateDTO,
      @RequestParam(defaultValue = "false") boolean ignoreDuplicates,
      Authentication authentication) {

    ThreadDTO createdThread =
        threadService.createThread(threadCreateDTO, ignoreDuplicates, authentication);
    return ResponseEntity.status(HttpStatus.CREATED).body(createdThread);
  }

  @GetMapping("/{username}/{threadId}")
  public ResponseEntity<ThreadDTO> expandThread(
      @PathVariable String username, @PathVariable UUID threadId) {
    ThreadDTO expandedThread = threadService.expandThread(username, threadId);
    return ResponseEntity.ok(expandedThread);
  }

  @DeleteMapping("/{threadId}")
  public ResponseEntity<Void> deleteThread(
      @PathVariable UUID threadId, Authentication authentication) {
    threadService.deleteThread(threadId, authentication);
    return ResponseEntity.noContent().build();
  }
}
