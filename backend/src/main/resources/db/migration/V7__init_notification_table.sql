CREATE TABLE techforum.notifications (
    id UUID PRIMARY KEY,
    recipient_username VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON techforum.notifications(recipient_username, created_at DESC);
