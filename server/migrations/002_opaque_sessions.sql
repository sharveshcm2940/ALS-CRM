DELETE FROM sessions;
ALTER TABLE sessions ADD COLUMN token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL, ADD UNIQUE INDEX sessions_token_hash_unique (token_hash);
