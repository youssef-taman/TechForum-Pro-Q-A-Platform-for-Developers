package com.techforum.backend.domain.thread;

import com.techforum.backend.domain.thread.dtos.ThreadCreateDTO;
import com.techforum.backend.domain.thread.dtos.ThreadDTO;
import com.techforum.backend.domain.thread.dtos.ThreadUpdateDTO;
import com.techforum.backend.domain.thread.enums.ThreadStatus;
import jakarta.validation.Valid;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/threads")
@RequiredArgsConstructor
public class ThreadController {

  private final ThreadService threadService;

  @PostMapping
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

  @PatchMapping("/{threadId}")
  public ResponseEntity<ThreadDTO> updateThread(
      @PathVariable UUID threadId,
      @Valid @RequestBody ThreadUpdateDTO threadUpdateDTO,
      Authentication authentication) {
    ThreadDTO updatedThread = threadService.updateThread(threadId, threadUpdateDTO, authentication);
    return ResponseEntity.ok(updatedThread);
  }

  @DeleteMapping("/{threadId}")
  public ResponseEntity<Void> deleteThread(
      @PathVariable UUID threadId, Authentication authentication) {
    threadService.deleteThread(threadId, authentication);
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/user/{username}")
  public ResponseEntity<Page<ThreadDTO>> getUserThreads(
      @PathVariable String username,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "latest", required = false) String sortBy,
      @RequestParam(required = false) ThreadStatus status,
      @RequestParam(required = false) Set<String> tags) {
    Page<ThreadDTO> userThreads =
        threadService.getUserThreads(username, page, size, sortBy, status, tags);
    return ResponseEntity.ok(userThreads);
  }

  @GetMapping
  public ResponseEntity<Page<ThreadDTO>> getTimeline(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "latest", required = false) String sortBy,
      @RequestParam(required = false) ThreadStatus status,
      @RequestParam(required = false) Set<String> tags) {
    Page<ThreadDTO> userThreads = threadService.getTimeline(page, size, sortBy, status, tags);
    return ResponseEntity.ok(userThreads);
  }
}
