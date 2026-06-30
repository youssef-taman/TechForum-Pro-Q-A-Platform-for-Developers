package com.techforum.backend.domain.notification;

import com.techforum.backend.domain.notification.dtos.NotificationDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(
    name = "Notifications",
    description =
        "Endpoints for retrieving and managing user notifications, including real-time SSE streaming")
@SecurityRequirement(name = "Bearer Authentication")
@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;
  // In-memory store for SSE connections. (Note: For multi-node deployments, use Redis Pub/Sub
  // instead)
  private final ConcurrentHashMap<String, SseEmitter> emitters = new ConcurrentHashMap<>();

  @Operation(
      summary = "Get notifications",
      description =
          "Returns a paginated list of notifications for the authenticated user, ordered by most recent first. "
              + "Supports standard Spring `Pageable` query parameters: `page`, `size`, and `sort`.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Notifications returned successfully",
            content = @Content(schema = @Schema(implementation = Page.class))),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
      })
  @GetMapping
  public ResponseEntity<Page<NotificationDTO>> getNotifications(
      Pageable pageable, Authentication authentication) {
    String username = authentication.getName();
    return ResponseEntity.ok(notificationService.getUserNotifications(username, pageable));
  }

  @Operation(
      summary = "Mark a notification as read",
      description =
          "Marks a single notification as read. The notification must belong to the authenticated user.",
      parameters = {
        @Parameter(
            name = "id",
            description = "UUID of the notification to mark as read",
            required = true)
      },
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "Notification marked as read",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content),
        @ApiResponse(
            responseCode = "403",
            description = "Forbidden – notification belongs to another user",
            content = @Content),
        @ApiResponse(
            responseCode = "404",
            description = "Notification not found",
            content = @Content)
      })
  @PatchMapping("/{id}/read")
  public ResponseEntity<Void> markAsRead(@PathVariable UUID id, Authentication authentication) {
    notificationService.markAsRead(id, authentication.getName());
    return ResponseEntity.ok().build();
  }

  @Operation(
      summary = "Mark all notifications as read",
      description =
          "Marks every unread notification for the authenticated user as read in a single operation.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "All notifications marked as read",
            content = @Content),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
      })
  @PatchMapping("/read")
  public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
    notificationService.markAllAsRead(authentication.getName());
    return ResponseEntity.ok().build();
  }

  @Operation(
      summary = "Stream notifications (SSE)",
      description =
          "Opens a Server-Sent Events (SSE) stream that pushes real-time notification events to the client. "
              + "The connection is kept alive indefinitely. "
              + "On connect, a `connected` event is immediately sent as a heartbeat confirmation. "
              + "Subsequent events are named `notification` and carry a `NotificationDTO` payload as JSON. "
              + "**Note:** Because browser `EventSource` does not support custom headers, pass the JWT as a "
              + "`token` query parameter if your client cannot set the `Authorization` header on SSE requests.",
      responses = {
        @ApiResponse(
            responseCode = "200",
            description = "SSE stream opened; events will follow",
            content = @Content(mediaType = MediaType.TEXT_EVENT_STREAM_VALUE)),
        @ApiResponse(responseCode = "401", description = "Unauthorized", content = @Content)
      })
  @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamNotifications(Authentication authentication) {
    String username = authentication.getName();

    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    emitters.put(username, emitter);

    emitter.onCompletion(() -> emitters.remove(username));
    emitter.onTimeout(() -> emitters.remove(username));
    emitter.onError(e -> emitters.remove(username));

    try {
      emitter.send(SseEmitter.event().name("connected").data("SSE Connected"));
    } catch (Exception e) {
      emitter.completeWithError(e);
    }

    return emitter;
  }

  /**
   * Pushes a notification event to a connected user's SSE stream.
   *
   * <p>This is an internal method intended to be called by {@code CommentService}, {@code
   * ThreadService}, or any other service that generates notification events. It is not exposed as
   * an HTTP endpoint.
   *
   * @param username The username of the target user.
   * @param dto The notification payload to send.
   */
  public void sendNotificationToUser(String username, NotificationDTO dto) {
    SseEmitter emitter = emitters.get(username);
    if (emitter != null) {
      try {
        emitter.send(SseEmitter.event().name("notification").data(dto));
      } catch (Exception e) {
        emitters.remove(username);
      }
    }
  }

  @GetMapping("/unread-count")
  public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
    long count = notificationService.getUnreadCount(authentication.getName());
    return ResponseEntity.ok(Map.of("count", count));
  }
}
