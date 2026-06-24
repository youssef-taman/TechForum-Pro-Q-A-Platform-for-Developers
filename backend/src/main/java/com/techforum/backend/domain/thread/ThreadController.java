package com.techforum.backend.domain.thread;

import com.techforum.backend.domain.thread.dtos.*;
import jakarta.validation.Valid;
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

  @PostMapping("/suggest-tags")
  public ResponseEntity<String[]> suggestTags(@RequestBody SuggestTagsRequest request) {
    return ResponseEntity.ok(threadService.suggestTags(request.title(), request.body()));
  }

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
      @PathVariable String username, ThreadSearchDTO threadSearchDTO) {
    Page<ThreadDTO> userThreads = threadService.getUserThreads(threadSearchDTO, username);
    return ResponseEntity.ok(userThreads);
  }

  @GetMapping
  public ResponseEntity<Page<ThreadDTO>> getTimeline(ThreadSearchDTO threadSearchDTO) {
    Page<ThreadDTO> userThreads = threadService.getTimeline(threadSearchDTO);
    return ResponseEntity.ok(userThreads);
  }

  @GetMapping("/search")
  public ResponseEntity<Page<ThreadDTO>> searchThreads(ThreadSearchDTO threadSearchDTO) {
    Page<ThreadDTO> searchResult = threadService.searchThreads(threadSearchDTO);
    return ResponseEntity.ok(searchResult);
  }
}
