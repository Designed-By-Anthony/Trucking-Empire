-- One row per player. id is 'email:user@email.com' for linked players, UUID for anonymous.
CREATE TABLE IF NOT EXISTS player_state (
  id                     TEXT    PRIMARY KEY,
  email                  TEXT,                           -- normalized email, null for anon
  state_json             TEXT    NOT NULL DEFAULT '{}',
  push_subscription_json TEXT,                           -- Web Push subscription object
  route_launched_at      INTEGER,                        -- unix ms — set when route dispatched
  route_manifest_json    TEXT,                           -- stops snapshot for offline progression
  last_seen_at           INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at             INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS idx_ps_email    ON player_state (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ps_push     ON player_state (last_seen_at)
  WHERE push_subscription_json IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ps_route    ON player_state (route_launched_at)
  WHERE route_launched_at IS NOT NULL;

-- Pending push notifications. fires_at lets the cron skip the game-state blob entirely.
CREATE TABLE IF NOT EXISTS pending_notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id   TEXT    NOT NULL REFERENCES player_state(id) ON DELETE CASCADE,
  event_type  TEXT    NOT NULL,   -- 'dispatch' | 'route_complete' | 'linhaul_arrived'
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  event_id    TEXT,
  fires_at    INTEGER NOT NULL,   -- unix ms
  sent_at     INTEGER             -- null = unsent
);

CREATE INDEX IF NOT EXISTS idx_notif_pending ON pending_notifications (fires_at)
  WHERE sent_at IS NULL;
