CREATE TYPE role_type AS ENUM ('ADMIN', 'MODERATOR', 'USER');

CREATE TABLE tags
(
    id       UUID        NOT NULL,
    tag_name VARCHAR(30) NOT NULL,
    CONSTRAINT pk_tags PRIMARY KEY (id)
);

CREATE TABLE users
(
    id           UUID         NOT NULL,
    username     VARCHAR(30)  NOT NULL,
    email        VARCHAR(255) NOT NULL,
    password     VARCHAR(255) NOT NULL,
    role         role_type    NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    is_suspended BOOLEAN      NOT NULL,
    CONSTRAINT pk_users PRIMARY KEY (id)
);

ALTER TABLE tags
    ADD CONSTRAINT uc_tags_tag_name UNIQUE (tag_name);

ALTER TABLE users
    ADD CONSTRAINT uc_users_email UNIQUE (email);

ALTER TABLE users
    ADD CONSTRAINT uc_users_username UNIQUE (username);