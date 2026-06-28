package com.techforum.backend.domain.user.dtos;

public record AdminMetricsDTO(
    long totalUsers,
    long suspendedUsers,
    long openThreads,
    long pendingThreads,
    long resolvedThreads,
    long closedThreads,
    long totalComments,
    double resolutionRate) {}
