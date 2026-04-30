package com.techforum.backend.domain.thread.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum ThreadStatus {

    OPEN(
            "Open for discussion. Users can add new replies and vote.",
            true,
            true
    ),
    RESOLVED(
            "The author has marked a reply as the correct solution.",
            true,
            true
    ),
    CLOSED(
            "Closed by moderators or its author. No new replies or votes are allowed.",
            false,
            false
    );

    private final String description;
    private final boolean allowsNewReplies;
    private final boolean allowsVoting;

}