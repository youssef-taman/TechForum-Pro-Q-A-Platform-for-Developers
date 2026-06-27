package com.techforum.backend.domain.comment;

import com.techforum.backend.domain.comment.dtos.AddCommentDTO;
import com.techforum.backend.domain.comment.dtos.CommentDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(
    name = "Comments",
    description = "Endpoints for creating, reading, updating, and deleting comments and replies")
@SecurityRequirement(name = "Bearer Authentication")
@RestController
@RequestMapping("/comments")
@RequiredArgsConstructor
public class CommentController {

  private final CommentService commentService;

  @Operation(
      summary = "Get comments for a thread",
      description =
          "Returns a paginated list of top-level comments for the given thread. "
              + "Sort options: `latest` (default), `oldest`, `top`.",
      parameters = {
        @Parameter(name = "threadId", description = "UUID of the thread", required = true),
        @Parameter(name = "page", description = "Zero-based page index (default: 0)"),
        @Parameter(name = "size", description = "Number of items per page (default: 10)"),
        @Parameter(
            name = "sortBy",
            description = "Sort order: `latest`, `oldest`, or `top` (default: `latest`)")
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Page of comments returned successfully",
            content = @Content(schema = @Schema(implementation = Page.class))),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
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

  @Operation(
      summary = "Get replies to a comment",
      description = "Returns a paginated list of direct replies to the given comment.",
      parameters = {
        @Parameter(name = "commentId", description = "UUID of the parent comment", required = true),
        @Parameter(name = "page", description = "Zero-based page index (default: 0)"),
        @Parameter(name = "size", description = "Number of items per page (default: 10)"),
        @Parameter(
            name = "sortBy",
            description = "Sort order: `latest`, `oldest`, or `top` (default: `latest`)")
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Page of replies returned successfully",
            content = @Content(schema = @Schema(implementation = Page.class))),
        @ApiResponse(responseCode = "404", description = "Comment not found", content = @Content)
      })
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

  @Operation(
      summary = "Add a comment",
      description =
          "Creates a new comment on a thread, or a reply to an existing comment. "
              + "Set `parentCommentId` in the request body to post a reply.",
      responses = {
        @ApiResponse(
            responseCode = "201",
            description = "Comment created successfully",
            content = @Content(schema = @Schema(implementation = CommentDTO.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "404",
            description = "Thread or parent comment not found",
            content = @Content)
      })
  @PostMapping
  public ResponseEntity<CommentDTO> addComment(
      @Valid @RequestBody AddCommentDTO addCommentDTO, Authentication authentication) {
    CommentDTO commentDTO = commentService.addComment(addCommentDTO, authentication);
    return ResponseEntity.status(HttpStatus.CREATED).body(commentDTO);
  }

  @Operation(
      summary = "Delete a comment",
      description =
          "Permanently deletes a comment. Only the comment author or an admin/moderator may delete a comment.",
      parameters = {
        @Parameter(
            name = "commentId",
            description = "UUID of the comment to delete",
            required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "Comment deleted successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Forbidden – not the comment owner",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "Comment not found", content = @Content)
      })
  @DeleteMapping("/{commentId}")
  public ResponseEntity<Void> deleteComment(
      @PathVariable UUID commentId, Authentication authentication) {
    commentService.deleteComment(commentId, authentication);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Update a comment",
      description =
          "Replaces the content of an existing comment. Only the comment author may edit. "
              + "Request body must be a JSON object with a non-blank `content` field.",
      parameters = {
        @Parameter(
            name = "commentId",
            description = "UUID of the comment to update",
            required = true)
      },
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "JSON payload with updated comment content",
              required = true,
              content =
                  @Content(
                      schema =
                          @Schema(
                              type = "object",
                              example = "{\"content\": \"Updated comment text here\"}"))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Comment updated successfully",
            content = @Content(schema = @Schema(implementation = CommentDTO.class))),
        @ApiResponse(
            responseCode = "400",
            description = "Content is missing or blank",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Forbidden – not the comment owner",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "Comment not found", content = @Content)
      })
  @PatchMapping("/{commentId}")
  public ResponseEntity<CommentDTO> updateComment(
      @PathVariable UUID commentId,
      @RequestBody Map<String, String> payload,
      Authentication authentication) {

    String updatedContent = payload.get("content");
    if (updatedContent == null || updatedContent.isBlank()) {
      throw new IllegalArgumentException("Content cannot be empty");
    }

    CommentDTO commentDTO = commentService.updateComment(commentId, updatedContent, authentication);
    return ResponseEntity.ok(commentDTO);
  }
}
