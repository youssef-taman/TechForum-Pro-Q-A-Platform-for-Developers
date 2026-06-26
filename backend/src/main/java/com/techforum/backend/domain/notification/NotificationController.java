package com.techforum.backend.domain.notification;

import com.techforum.backend.domain.notification.dtos.NotificationDTO;
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

@Slf4j
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService notificationService;
  // In-memory store for SSE connections. (Note: For multi-node deployments, use Redis Pub/Sub
  // instead)
  private final ConcurrentHashMap<String, SseEmitter> emitters = new ConcurrentHashMap<>();

  @GetMapping
  public ResponseEntity<Page<NotificationDTO>> getNotifications(
      Pageable pageable, Authentication authentication) {
    String username = authentication.getName();
    return ResponseEntity.ok(notificationService.getUserNotifications(username, pageable));
  }

  @PatchMapping("/{id}/read")
  public ResponseEntity<Void> markAsRead(@PathVariable UUID id, Authentication authentication) {
    notificationService.markAsRead(id, authentication.getName());
    return ResponseEntity.ok().build();
  }

  @PatchMapping("/read")
  public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
    notificationService.markAllAsRead(authentication.getName());
    return ResponseEntity.ok().build();
  }

  @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamNotifications(Authentication authentication) {
    String username = authentication.getName();

    // Allow fallback to query param token (as we set up in JwtAuthFilter Patch 1)
    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    emitters.put(username, emitter);

    emitter.onCompletion(() -> emitters.remove(username));
    emitter.onTimeout(() -> emitters.remove(username));
    emitter.onError(e -> emitters.remove(username));

    // Send initial heartbeat to confirm connection
    try {
      emitter.send(SseEmitter.event().name("connected").data("SSE Connected"));
    } catch (Exception e) {
      emitter.completeWithError(e);
    }

    return emitter;
  }

  // Call this method from your CommentService/ThreadService when an event occurs
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
}
