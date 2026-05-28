package com.techforum.backend.domain.interaction;

import com.techforum.backend.domain.interaction.dtos.BookmarkDTO;
import com.techforum.backend.domain.interaction.dtos.VoteDTO;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

  @GetMapping("/bookmarks")
  public ResponseEntity<Page<BookmarkDTO>> listUserBookmarks(
      Pageable pageable, Authentication authentication) {
    Page<BookmarkDTO> bookmarks = interactionService.listUserBookmarks(pageable, authentication);
    return ResponseEntity.ok(bookmarks);
  }

  @PostMapping("/comments/{commentId}/votes")
  public ResponseEntity<Void> voteComment(
      @PathVariable UUID commentId, @RequestBody VoteDTO voteDTO, Authentication authentication) {
    interactionService.voteComment(commentId, voteDTO.type(), authentication);
    return ResponseEntity.ok().build();
  }
}
