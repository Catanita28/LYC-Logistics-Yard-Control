CREATE TABLE IF NOT EXISTS lyc_schema_version (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS lyc_guards (guard_id text PRIMARY KEY, active boolean NOT NULL DEFAULT true, role text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS lyc_movements (record_id text PRIMARY KEY, idempotency_key text NOT NULL UNIQUE, payload jsonb NOT NULL, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), guard_id text REFERENCES lyc_guards(guard_id));
ALTER TABLE lyc_movements ADD COLUMN IF NOT EXISTS guard_id text REFERENCES lyc_guards(guard_id);
CREATE INDEX IF NOT EXISTS lyc_movements_created_idx ON lyc_movements(created_at, record_id);
CREATE TABLE IF NOT EXISTS lyc_audit_events (event_id text PRIMARY KEY, guard_id text NOT NULL, event_hash text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS lyc_evidences (evidence_id text PRIMARY KEY, record_id text NOT NULL REFERENCES lyc_movements(record_id), object_key text NOT NULL UNIQUE, sha256 text NOT NULL, captured_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'PENDING_UPLOAD', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS lyc_evidences_record_idx ON lyc_evidences(record_id);


CREATE TABLE IF NOT EXISTS lyc_audit_conflicts (
  conflict_id bigserial PRIMARY KEY,
  event_id text NOT NULL,
  guard_id text NOT NULL,
  event_hash text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION lyc_block_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'lyc_audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lyc_audit_events_no_update_delete ON lyc_audit_events;
CREATE TRIGGER lyc_audit_events_no_update_delete
BEFORE UPDATE OR DELETE ON lyc_audit_events
FOR EACH ROW EXECUTE FUNCTION lyc_block_audit_mutation();

ALTER TABLE lyc_evidences DROP CONSTRAINT IF EXISTS lyc_evidences_sha256_chk;
ALTER TABLE lyc_evidences ADD CONSTRAINT lyc_evidences_sha256_chk CHECK (sha256 ~ '^[0-9a-fA-F]{64}$');


ALTER TABLE lyc_guards ADD COLUMN IF NOT EXISTS pin_hash text;
CREATE TABLE IF NOT EXISTS lyc_guard_sessions (
  session_id uuid PRIMARY KEY,
  guard_id text NOT NULL REFERENCES lyc_guards(guard_id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lyc_guard_sessions_active_idx ON lyc_guard_sessions(token_hash, expires_at) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS lyc_guard_sessions_one_active_per_guard_idx ON lyc_guard_sessions(guard_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS lyc_auth_events (
  auth_event_id bigserial PRIMARY KEY,
  guard_id text NOT NULL,
  outcome text NOT NULL,
  request_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lyc_auth_events_outcome_chk CHECK (outcome IN ('LOGIN_SUCCESS','LOGIN_FAILED','SHIFT_END'))
);
CREATE INDEX IF NOT EXISTS lyc_auth_events_guard_idx ON lyc_auth_events(guard_id, created_at DESC);
CREATE OR REPLACE FUNCTION lyc_block_auth_event_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'lyc_auth_events is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS lyc_auth_events_no_update_delete ON lyc_auth_events;
CREATE TRIGGER lyc_auth_events_no_update_delete
BEFORE UPDATE OR DELETE ON lyc_auth_events
FOR EACH ROW EXECUTE FUNCTION lyc_block_auth_event_mutation();
