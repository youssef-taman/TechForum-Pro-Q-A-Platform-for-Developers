CREATE TYPE vote_type AS ENUM ('UPVOTE', 'DOWNVOTE');

CREATE TABLE bookmarks
(
    id         UUID NOT NULL,
    thread_id  UUID NOT NULL,
    user_id    UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_bookmarks PRIMARY KEY (id)
);

CREATE TABLE comments
(
    id          UUID    NOT NULL,
    parent_id   UUID,
    thread_id   UUID    NOT NULL,
    author_id   UUID    NOT NULL,
    content     TEXT    NOT NULL,
    reply_count INTEGER NOT NULL,
    score       INTEGER NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_comments PRIMARY KEY (id)
);

CREATE TABLE votes
(
    id         UUID     NOT NULL,
    user_id    UUID     NOT NULL,
    comment_id UUID     NOT NULL,
    type       vote_type NOT NULL,
    CONSTRAINT pk_votes PRIMARY KEY (id)
);

ALTER TABLE votes
    ADD CONSTRAINT uc_vote UNIQUE (user_id, comment_id);

ALTER TABLE bookmarks
    ADD CONSTRAINT uc_bookmark UNIQUE (user_id, thread_id);

ALTER TABLE bookmarks
    ADD CONSTRAINT FK_BOOKMARKS_ON_THREAD FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE;

ALTER TABLE bookmarks
    ADD CONSTRAINT FK_BOOKMARKS_ON_USER FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE comments
    ADD CONSTRAINT FK_COMMENTS_ON_AUTHOR FOREIGN KEY (author_id) REFERENCES users (id);

ALTER TABLE comments
    ADD CONSTRAINT FK_COMMENTS_ON_PARENT FOREIGN KEY (parent_id) REFERENCES comments (id) ON DELETE CASCADE;

ALTER TABLE comments
    ADD CONSTRAINT FK_COMMENTS_ON_THREAD FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE;

ALTER TABLE votes
    ADD CONSTRAINT FK_VOTES_ON_COMMENT FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE;

ALTER TABLE votes
    ADD CONSTRAINT FK_VOTES_ON_USER FOREIGN KEY (user_id) REFERENCES users (id);
