package com.techforum.backend.domain.comment;

import com.techforum.backend.domain.comment.dtos.AddCommentDTO;
import com.techforum.backend.domain.comment.dtos.CommentDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("comments")
@RequiredArgsConstructor
public class CommentController {

  private final CommentService commentService;

  @PostMapping
  public ResponseEntity<CommentDTO> addComment(
      @Valid @RequestBody AddCommentDTO addCommentDTO, Authentication authentication) {
    CommentDTO commentDTO = commentService.addComment(addCommentDTO, authentication);
    return ResponseEntity.status(HttpStatus.CREATED).body(commentDTO);
  }
}
