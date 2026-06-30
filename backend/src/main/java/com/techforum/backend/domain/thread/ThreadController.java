package com.techforum.backend.domain.thread;

import com.techforum.backend.domain.thread.dtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(
    name = "Threads",
    description = "Endpoints for creating, browsing, searching, and moderating forum threads")
@RestController
@RequestMapping("/threads")
@RequiredArgsConstructor
public class ThreadController {

  private final ThreadService threadService;

  @Operation(
      summary = "Suggest tags for a thread",
      description =
          "Uses AI to suggest relevant tags based on the provided thread title and body. "
              + "Returns an array of tag name strings. No authentication required.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Thread title and body to analyse",
              required = true,
              content = @Content(schema = @Schema(implementation = SuggestTagsRequest.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Suggested tags returned",
            content =
                @Content(
                    array = @ArraySchema(schema = @Schema(type = "string", example = "java")))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content)
      })
  @PostMapping("/suggestTags")
  public ResponseEntity<String[]> suggestTags(@RequestBody SuggestTagsRequest request) {
    return ResponseEntity.ok(threadService.suggestTags(request.title(), request.body()));
  }

  @Operation(
      summary = "Check for duplicate threads",
      description =
          "Analyses the provided thread draft and returns a list of semantically similar existing threads. "
              + "Call this before `POST /threads` to warn the user about potential duplicates. "
              + "Returns an empty list if no duplicates are found.",
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Thread draft to check",
              required = true,
              content = @Content(schema = @Schema(implementation = ThreadCreateDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Duplicate check completed",
            content =
                @Content(
                    array =
                        @ArraySchema(schema = @Schema(implementation = DuplicateThreadDTO.class)))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
      })
  @SecurityRequirement(name = "Bearer Authentication")
  @PostMapping("/duplicates")
  public ResponseEntity<List<DuplicateThreadDTO>> checkDuplicates(
      @Valid @RequestBody ThreadCreateDTO threadCreateDTO, Authentication authentication) {
    List<DuplicateThreadDTO> duplicates =
        threadService.checkDuplicates(threadCreateDTO, authentication);
    return ResponseEntity.ok(duplicates);
  }

  @Operation(
      summary = "Create a thread",
      description =
          "Creates and publishes a new forum thread. "
              + "Set `ignoreDuplicates=true` to bypass the duplicate guard after the user has acknowledged similar threads.",
      parameters = {
        @Parameter(
            name = "ignoreDuplicates",
            description = "Skip duplicate detection and create the thread anyway (default: false)")
      },
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Thread content and metadata",
              required = true,
              content = @Content(schema = @Schema(implementation = ThreadCreateDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "201",
            description = "Thread created successfully",
            content = @Content(schema = @Schema(implementation = ThreadDTO.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "409",
            description = "Duplicate thread detected (use ignoreDuplicates=true to override)",
            content = @Content)
      })
  @SecurityRequirement(name = "Bearer Authentication")
  @PostMapping
  public ResponseEntity<ThreadDTO> createThread(
      @Valid @RequestBody ThreadCreateDTO threadCreateDTO,
      @RequestParam(defaultValue = "false") boolean ignoreDuplicates,
      Authentication authentication) {
    ThreadDTO createdThread =
        threadService.createThread(threadCreateDTO, ignoreDuplicates, authentication);
    return ResponseEntity.status(HttpStatus.CREATED).body(createdThread);
  }

  @Operation(
      summary = "Get thread by ID",
      description = "Retrieves a single thread by its UUID. No authentication required.",
      parameters = {
        @Parameter(name = "threadId", description = "UUID of the thread", required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Thread returned successfully",
            content = @Content(schema = @Schema(implementation = ThreadDTO.class))),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
  @GetMapping("/{threadId}")
  public ResponseEntity<ThreadDTO> getThreadById(@PathVariable UUID threadId) {
    ThreadDTO thread = threadService.getThreadById(threadId);
    return ResponseEntity.ok(thread);
  }

  @Operation(
      summary = "Expand a thread (by username + ID)",
      description =
          "Retrieves a thread using a user-friendly URL that includes the author's username. "
              + "No authentication required.",
      parameters = {
        @Parameter(
            name = "username",
            description = "Username of the thread author",
            required = true),
        @Parameter(name = "threadId", description = "UUID of the thread", required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Thread returned successfully",
            content = @Content(schema = @Schema(implementation = ThreadDTO.class))),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
  @GetMapping("/{username}/{threadId}")
  public ResponseEntity<ThreadDTO> expandThread(
      @PathVariable String username, @PathVariable UUID threadId) {
    ThreadDTO expandedThread = threadService.expandThread(username, threadId);
    return ResponseEntity.ok(expandedThread);
  }

  @Operation(
      summary = "Update a thread",
      description =
          "Partially updates a thread's title, body, or tags. "
              + "Only the thread author or an admin may update a thread.",
      parameters = {
        @Parameter(name = "threadId", description = "UUID of the thread to update", required = true)
      },
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Fields to update (all optional)",
              required = true,
              content = @Content(schema = @Schema(implementation = ThreadUpdateDTO.class))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Thread updated successfully",
            content = @Content(schema = @Schema(implementation = ThreadDTO.class))),
        @ApiResponse(responseCode = "400", description = "Validation failed", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Forbidden – not the thread owner",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
  @SecurityRequirement(name = "Bearer Authentication")
  @PatchMapping("/{threadId}")
  public ResponseEntity<ThreadDTO> updateThread(
      @PathVariable UUID threadId,
      @Valid @RequestBody ThreadUpdateDTO threadUpdateDTO,
      Authentication authentication) {
    ThreadDTO updatedThread = threadService.updateThread(threadId, threadUpdateDTO, authentication);
    return ResponseEntity.ok(updatedThread);
  }

  @Operation(
      summary = "Delete a thread",
      description =
          "Permanently deletes a thread and all associated comments. "
              + "Only the thread author or an admin may delete a thread.",
      parameters = {
        @Parameter(name = "threadId", description = "UUID of the thread to delete", required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "Thread deleted successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Forbidden – not the thread owner",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
  @SecurityRequirement(name = "Bearer Authentication")
  @DeleteMapping("/{threadId}")
  public ResponseEntity<Void> deleteThread(
      @PathVariable UUID threadId, Authentication authentication) {
    threadService.deleteThread(threadId, authentication);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Get threads by user",
      description =
          "Returns a paginated list of threads created by the specified user. "
              + "Supports filtering and sorting via `ThreadSearchDTO` query parameters.",
      parameters = {
        @Parameter(
            name = "username",
            description = "Username of the author to filter by",
            required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Threads returned successfully",
            content = @Content(schema = @Schema(implementation = Page.class))),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
      })
  @GetMapping("/user/{username}")
  public ResponseEntity<Page<ThreadDTO>> getUserThreads(
      @PathVariable String username, ThreadSearchDTO threadSearchDTO) {
    Page<ThreadDTO> userThreads = threadService.getUserThreads(threadSearchDTO, username);
    return ResponseEntity.ok(userThreads);
  }

  @Operation(
      summary = "Get timeline",
      description =
          "Returns a personalised or global paginated feed of threads. "
              + "Supports filtering, sorting, and pagination via `ThreadSearchDTO` query parameters.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Timeline returned successfully",
            content = @Content(schema = @Schema(implementation = Page.class)))
      })
  @GetMapping
  public ResponseEntity<Page<ThreadDTO>> getTimeline(ThreadSearchDTO threadSearchDTO) {
    Page<ThreadDTO> userThreads = threadService.getTimeline(threadSearchDTO);
    return ResponseEntity.ok(userThreads);
  }

  @Operation(
      summary = "Search threads",
      description =
          "Full-text search across thread titles and bodies. "
              + "Accepts keyword and filter parameters via `ThreadSearchDTO` query parameters.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Search results returned",
            content = @Content(schema = @Schema(implementation = Page.class)))
      })
  @GetMapping("/search")
  public ResponseEntity<Page<ThreadDTO>> searchThreads(ThreadSearchDTO threadSearchDTO) {
    Page<ThreadDTO> searchResult = threadService.searchThreads(threadSearchDTO);
    return ResponseEntity.ok(searchResult);
  }

  @Operation(
      summary = "List pending threads (Moderator/Admin)",
      description =
          "Returns a paginated list of threads awaiting moderation approval. "
              + "Requires the `MODERATOR` or `ADMIN` role.",
      parameters = {
        @Parameter(name = "page", description = "Zero-based page index (default: 0)"),
        @Parameter(name = "size", description = "Number of items per page (default: 10)")
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Pending threads returned",
            content = @Content(schema = @Schema(implementation = Page.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient role", content = @Content)
      })
  @SecurityRequirement(name = "Bearer Authentication")
  @GetMapping("/moderation/pending")
  @PreAuthorize("hasRole('MODERATOR') or hasRole('ADMIN')")
  public ResponseEntity<Page<ThreadDTO>> getPendingThreads(
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
    return ResponseEntity.ok(threadService.getPendingThreads(page, size));
  }

  @Operation(
      summary = "Moderate a thread (Moderator/Admin)",
      description =
          "Approves or rejects a pending thread. "
              + "Approved threads transition to `OPEN` status; rejected threads transition to `CLOSED`. "
              + "Requires the `MODERATOR` or `ADMIN` role.",
      parameters = {
        @Parameter(
            name = "threadId",
            description = "UUID of the thread to moderate",
            required = true)
      },
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Moderation action: `approve` or `reject`",
              required = true,
              content =
                  @Content(
                      schema = @Schema(type = "object", example = "{\"action\": \"approve\"}"))),
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Thread moderated successfully",
            content = @Content(schema = @Schema(implementation = ThreadDTO.class))),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid action value",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(responseCode = "403", description = "Insufficient role", content = @Content),
        @ApiResponse(responseCode = "404", description = "Thread not found", content = @Content)
      })
  @SecurityRequirement(name = "Bearer Authentication")
  @PatchMapping("/{threadId}/moderate")
  @PreAuthorize("hasRole('MODERATOR') or hasRole('ADMIN')")
  public ResponseEntity<ThreadDTO> moderateThread(
      @PathVariable UUID threadId, @RequestBody Map<String, String> body) {
    return ResponseEntity.ok(threadService.moderateThread(threadId, body));
  }
}
