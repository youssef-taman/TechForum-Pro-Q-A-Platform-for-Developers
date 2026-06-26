-- =============================================================
-- TechForum Pro — Constant Admin User
-- Run once (or anytime): uses INSERT ... ON CONFLICT DO NOTHING
-- so it is safe to re-run without duplicating the record.
-- =============================================================

-- Credentials (keep these somewhere safe, e.g. a password manager)
--   Username : techforum_admin
--   Email    : admin@techforumpro.com
--   Password : TechforumPro@Admin2025!
-- =============================================================

INSERT INTO users (
    id,
    username,
    email,
    password,
    role,
    created_at,
    is_suspended
)
VALUES (
    'c541f368-c7f3-4294-9c66-ee6ddbb1ec6d',
    'techforum_admin',
    'admin@techforumpro.com',
    '$2b$12$YpQa03dwQNt2itSPI1Ez2.djMvqK6zivcvOetkblwoA5ivoYtIWNO',
    'ADMIN',
    NOW(),
    FALSE
)
ON CONFLICT (id) DO NOTHING;