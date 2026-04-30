CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments (thread_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);

CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads (user_id);

CREATE INDEX IF NOT EXISTS idx_thread_tags_tag_id ON thread_tags (tag_id);