package com.techforum.backend.domain.user.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum RoleType {

    ADMIN(
            "Has full access to the system, including user management, platform settings, " +
                    "and unrestricted access to all data.",
            true,
            false
    ),
    MODERATOR(
            "Responsible for moderating content, approving or rejecting threads, " +
                    "and removing offensive comments to maintain discussion quality.",
            true,
            true
    ),
    USER(
            "Can create new threads, reply to discussions, vote on content, " +
                    "and interact with other community members.",
            false,
            true
    );

    private final String description;
    private final boolean canDeleteOrSuspend;
    private final boolean canBeSuspendedOrDeleted;
}
