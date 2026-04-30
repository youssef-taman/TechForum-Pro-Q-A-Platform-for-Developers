CREATE TYPE thread_status AS ENUM ('OPEN', 'CLOSED', 'RESOLVED');

CREATE EXTENSION IF NOT EXISTS VECTOR SCHEMA techforum;

CREATE TABLE thread_embeddings
(
    thread_id UUID NOT NULL,
    embedding VECTOR(768) NOT NULL,
    CONSTRAINT pk_thread_embeddings PRIMARY KEY (thread_id)
);

CREATE TABLE thread_tags
(
    tag_id    UUID NOT NULL,
    thread_id UUID NOT NULL,
    CONSTRAINT pk_thread_tags PRIMARY KEY (tag_id, thread_id)
);

CREATE TABLE threads
(
    id         UUID         NOT NULL,
    user_id    UUID         NOT NULL,
    title      VARCHAR(255) NOT NULL,
    body       TEXT         NOT NULL,
    status     thread_status  NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT pk_threads PRIMARY KEY (id)
);

ALTER TABLE threads
    ADD CONSTRAINT FK_THREADS_ON_USER FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE thread_embeddings
    ADD CONSTRAINT FK_THREAD_EMBEDDINGS_ON_THREAD FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE;

ALTER TABLE thread_tags
    ADD CONSTRAINT fk_thrtag_on_tag FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE;

ALTER TABLE thread_tags
    ADD CONSTRAINT fk_thrtag_on_thread FOREIGN KEY (thread_id) REFERENCES threads (id) ON DELETE CASCADE ;