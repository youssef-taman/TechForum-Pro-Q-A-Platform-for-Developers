package com.techforum.backend.domain.thread.dtos;

import java.util.UUID;

public record ThreadCreatedEvent(UUID threadId, String title, String body) {}
