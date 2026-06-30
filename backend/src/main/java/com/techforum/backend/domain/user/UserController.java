package com.techforum.backend.domain.user;

import com.techforum.backend.domain.user.dtos.AdminMetricsDTO;
import com.techforum.backend.domain.user.dtos.UserDTO;
import com.techforum.backend.domain.user.enums.RoleType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Tag(
    name = "Users",
    description = "Admin-only endpoints for user management, role promotion, and platform metrics")
@SecurityRequirement(name = "Bearer Authentication")
@Validated
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @Operation(
      summary = "Promote a user (Admin)",
      description =
          "Assigns a new role (e.g. `MODERATOR`) to the specified user. "
              + "Requires the `ADMIN` role.",
      parameters = {
        @Parameter(name = "id", description = "UUID of the user to promote", required = true)
      },
      requestBody =
          @io.swagger.v3.oas.annotations.parameters.RequestBody(
              description = "Role to assign to the user",
              required = true,
              content = @Content(schema = @Schema(implementation = PromotionRequest.class))),
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "User promoted successfully",
            content = @Content),
        @ApiResponse(responseCode = "400", description = "Invalid role", content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Insufficient role – Admin only",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
      })
  @PostMapping("/{id}/promote")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> promoteUser(
      @PathVariable UUID id, @RequestBody PromotionRequest request) {
    userService.promoteUser(id, request.role());
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Demote a moderator (Admin)",
      description =
          "Removes the `MODERATOR` role from the specified user, reverting them to the default `USER` role. "
              + "Requires the `ADMIN` role.",
      parameters = {
        @Parameter(name = "id", description = "UUID of the moderator to demote", required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "Moderator demoted successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Insufficient role – Admin only",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
      })
  @PostMapping("/{id}/demote")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> demoteModerator(@PathVariable UUID id) {
    userService.demoteModerator(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Suspend a user (Admin)",
      description =
          "Suspends the specified account, preventing login and API access. "
              + "Requires the `ADMIN` role.",
      parameters = {
        @Parameter(name = "id", description = "UUID of the user to suspend", required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "User suspended successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Insufficient role – Admin only",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
      })
  @PatchMapping("/{id}/suspend")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> suspend(@PathVariable UUID id) {
    userService.suspendUser(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Unsuspend a user (Admin)",
      description =
          "Lifts a suspension from the specified account, restoring normal access. "
              + "Requires the `ADMIN` role.",
      parameters = {
        @Parameter(name = "id", description = "UUID of the user to unsuspend", required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "User unsuspended successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Insufficient role – Admin only",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
      })
  @PatchMapping("/{id}/unsuspend")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> unsuspend(@PathVariable UUID id) {
    userService.unsuspendUser(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "Remove a user (Admin)",
      description =
          "Permanently deletes the specified user account and all associated data. "
              + "This action is irreversible. Requires the `ADMIN` role.",
      parameters = {
        @Parameter(name = "id", description = "UUID of the user to delete", required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "204",
            description = "User deleted successfully",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Insufficient role – Admin only",
            content = @Content),
        @ApiResponse(responseCode = "404", description = "User not found", content = @Content)
      })
  @DeleteMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Void> removeUser(@PathVariable UUID id) {
    userService.removeUser(id);
    return ResponseEntity.noContent().build();
  }

  @Operation(
      summary = "List users (Admin)",
      description =
          "Returns a paginated list of all registered users. "
              + "Use the `q` parameter to filter by username or email (case-insensitive substring match). "
              + "Requires the `ADMIN` role.",
      parameters = {
        @Parameter(name = "page", description = "Zero-based page index (default: 0, min: 0)"),
        @Parameter(name = "size", description = "Number of items per page (default: 10, min: 1)"),
        @Parameter(
            name = "q",
            description = "Optional search query to filter users by username or email")
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Users returned successfully",
            content = @Content(schema = @Schema(implementation = Page.class))),
        @ApiResponse(
            responseCode = "400",
            description = "Invalid pagination parameters",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Insufficient role – Admin only",
            content = @Content)
      })
  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<Page<UserDTO>> listUsers(
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "10") @Positive int size,
      @RequestParam(required = false) String q) {
    Page<UserDTO> userPage = userService.listUsers(page, size, q);
    return ResponseEntity.ok(userPage);
  }

  @Operation(
      summary = "Get admin metrics (Admin)",
      description =
          "Returns aggregate platform statistics such as total users, active threads, "
              + "comments posted, and recent signups. Requires the `ADMIN` role.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Metrics returned successfully",
            content = @Content(schema = @Schema(implementation = AdminMetricsDTO.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Insufficient role – Admin only",
            content = @Content)
      })
  @GetMapping("/metrics")
  @PreAuthorize("hasRole('ADMIN')")
  public AdminMetricsDTO getMetrics() {
    return userService.getMetrics();
  }

  public record PromotionRequest(
      @Schema(description = "Role to assign to the user", example = "MODERATOR") RoleType role) {}
}
