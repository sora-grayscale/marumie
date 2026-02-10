-- Add encrypted DEK storage to sessions for server-side E2EE.
-- The DEK is encrypted with a server-side session key (SESSION_ENCRYPTION_KEY env var)
-- before storage, providing defense-in-depth against DB compromise.
ALTER TABLE sessions ADD COLUMN encrypted_dek BYTEA;
