package com.techforum.backend.domain.notification.dtos;

import java.time.Instant;
import java.util.UUID;

public record NotificationDTO(
    UUID id,
    String type, // e.g., "REPLY", "MENTION", "THREAD_STATUS"
    String message,
    String link, // e.g., "/questions/123"
    boolean isRead,
    Instant createdAt) {}
