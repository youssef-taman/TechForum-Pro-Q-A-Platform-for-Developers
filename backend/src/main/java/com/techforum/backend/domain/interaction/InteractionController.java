package com.techforum.backend.domain.interaction;

import com.techforum.backend.domain.interaction.dtos.BookmarkDTO;
import com.techforum.backend.domain.interaction.dtos.VoteDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Interactions", description = "Endpoints for bookmarks and comment votes")
@SecurityRequirement(name = "Bearer Authentication")
@RestController
@RequestMapping("/interactions")
@RequiredArgsConstructor
public class InteractionController {

  private final InteractionService interactionService;

  @Operation(
      summary = "Bookmark a thread",
      description =
          "Saves the specified thread to the authenticated user's bookmarks. "
              + "If the thread is already bookmarked, the request is silently ignored (idempotent).",
      parameters = {
        @Parameter(
            name = "threadId",
            description = "UUID of the thread to bookmark",
            required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "201",
            description = "Thread bookmarked successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
  @PostMapping("/bookmarks/{threadId}")
  public ResponseEntity<Void> addBookmark(
      @PathVariable UUID threadId, Authentication authentication) {
    interactionService.addBookmark(threadId, authentication);
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }

  @Operation(
      summary = "Remove a bookmark",
      description =
          "Removes the specified thread from the authenticated user's bookmarks. "
              + "Returns 204 even if the bookmark did not exist (idempotent).",
      parameters = {
        @Parameter(
            name = "threadId",
            description = "UUID of the thread to un-bookmark",
            required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "Bookmark removed successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
  @DeleteMapping("/bookmarks/{threadId}")
  public ResponseEntity<Void> deleteBookmark(
      @PathVariable UUID threadId, Authentication authentication) {
    interactionService.removeBookmark(threadId, authentication);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "List bookmarks",
      description =
          "Returns a paginated list of threads bookmarked by the authenticated user. "
              + "Supports standard Spring `Pageable` query parameters: `page`, `size`, and `sort`.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Bookmarks returned successfully",
            content = @Content(schema = @Schema(implementation = Page.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
      })
  @GetMapping("/bookmarks")
  public ResponseEntity<Page<BookmarkDTO>> listUserBookmarks(
      Pageable pageable, Authentication authentication) {
    Page<BookmarkDTO> bookmarks = interactionService.listUserBookmarks(pageable, authentication);
    return ResponseEntity.ok(bookmarks);
  }

  @Operation(
      summary = "Vote on a comment",
      description =
          "Casts an upvote or downvote on a comment. "
              + "Sending the same vote type again toggles (removes) the vote. "
              + "The `type` field in the request body must be `UPVOTE` or `DOWNVOTE`.",
      parameters = {
        @Parameter(
            name = "commentId",
            description = "UUID of the comment to vote on",
            required = true)
      },
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Vote type payload",
              required = true,
              content =
                  @Content(schema = @Schema(type = "object", example = "{\"type\": \"UPVOTE\"}"))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Vote recorded successfully",
            content = @Content),
        @ApiResponse(responseCode = "400", description = "Invalid vote type", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "404", description = "Comment not found", content = @Content)
      })
  @PostMapping("/comments/{commentId}/votes")
  public ResponseEntity<Void> voteComment(
      @PathVariable UUID commentId, @RequestBody VoteDTO voteDTO, Authentication authentication) {
    interactionService.voteComment(commentId, voteDTO.type(), authentication);
    return ResponseEntity.ok().build();
  }
}
