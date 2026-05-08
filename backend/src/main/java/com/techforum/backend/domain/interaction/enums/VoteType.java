package com.techforum.backend.domain.interaction.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum VoteType {
  UPVOTE("Voting for a comment as useful or helpful.", 1),
  DOWNVOTE("Voting for a comment as redundant, outdated or useless.", -1);

  private final String description;
  private final Integer value;
}
