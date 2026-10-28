CREATE TABLE IF NOT EXISTS login_attempts (
  client TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_attempts_expires ON login_attempts(expires);
