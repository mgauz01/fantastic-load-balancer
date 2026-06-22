CREATE TABLE IF NOT EXISTS campaign_progress (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    highest_unlocked INTEGER NOT NULL DEFAULT 1,
    completed_levels TEXT NOT NULL DEFAULT '[]',
    pass_badges TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO campaign_progress (id, highest_unlocked, completed_levels, pass_badges, updated_at)
VALUES (1, 1, '[]', '[]', datetime('now'));

CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    initials TEXT NOT NULL,
    score INTEGER NOT NULL,
    active_traffic_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_rank
    ON leaderboard_entries (score DESC, active_traffic_ms DESC, created_at ASC);
