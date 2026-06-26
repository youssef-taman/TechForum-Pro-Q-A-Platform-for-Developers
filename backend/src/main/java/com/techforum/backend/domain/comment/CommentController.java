package com.techforum.backend.domain.comment;

import com.techforum.backend.domain.comment.dtos.AddCommentDTO;
import com.techforum.backend.domain.comment.dtos.CommentDTO;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/comments")
@RequiredArgsConstructor
public class CommentController {

  private final CommentService commentService;

  @GetMapping("/{threadId}")
  public ResponseEntity<Page<CommentDTO>> getThreadComments(
      @PathVariable UUID threadId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "latest", required = false) String sortBy,
      Authentication authentication) {
    Page<CommentDTO> commentDTOPage =
        commentService.getThreadComments(threadId, page, size, sortBy, authentication);
    return ResponseEntity.ok(commentDTOPage);
  }

  @GetMapping("/{commentId}/replies")
  public ResponseEntity<Page<CommentDTO>> getCommentReplies(
      @PathVariable UUID commentId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size,
      @RequestParam(defaultValue = "latest", required = false) String sortBy,
      Authentication authentication) {
    Page<CommentDTO> commentDTOPage =
        commentService.getCommentReplies(commentId, page, size, sortBy, authentication);
    return ResponseEntity.ok(commentDTOPage);
  }

  @PostMapping
  public ResponseEntity<CommentDTO> addComment(
      @Valid @RequestBody AddCommentDTO addCommentDTO, Authentication authentication) {
    CommentDTO commentDTO = commentService.addComment(addCommentDTO, authentication);
    return ResponseEntity.status(HttpStatus.CREATED).body(commentDTO);
  }

  @DeleteMapping("/{commentId}")
  public ResponseEntity<Void> deleteComment(
      @PathVariable UUID commentId, Authentication authentication) {
    commentService.deleteComment(commentId, authentication);
    return ResponseEntity.noContent().build();
  }

  // OLD:
  // @PatchMapping("/{commentId}")
  // public ResponseEntity<CommentDTO> updateComment(
  //     @PathVariable UUID commentId,
  //     @Valid @RequestBody String updatedContent,
  //     Authentication authentication) {
  //   CommentDTO commentDTO = commentService.updateComment(commentId, updatedContent,
  // authentication);
  //   return ResponseEntity.ok(commentDTO);
  // }

  // NEW:
  @PatchMapping("/{commentId}")
  public ResponseEntity<CommentDTO> updateComment(
      @PathVariable UUID commentId,
      @RequestBody java.util.Map<String, String> payload,
      Authentication authentication) {

    String updatedContent = payload.get("content");
    if (updatedContent == null || updatedContent.isBlank()) {
      throw new IllegalArgumentException("Content cannot be empty");
    }

    CommentDTO commentDTO = commentService.updateComment(commentId, updatedContent, authentication);
    return ResponseEntity.ok(commentDTO);
  }
}
