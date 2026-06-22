package com.techforum.backend.domain.user.dtos;

public record AdminMetricsDTO(
    long totalUsers, long openThreads, long resolvedThreads, long closedThreads) {}
