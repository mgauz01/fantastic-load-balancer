package sqlite

import (
	"context"
	"database/sql"
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/fantastic-load-balancer/flb/internal/domain"
	_ "modernc.org/sqlite"
)

//go:embed migrations/schema.sql
var schemaSQL string

// Open opens (or creates) a WAL SQLite database and runs migrations.
func Open(path string) (*sql.DB, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	if _, err := db.Exec(schemaSQL); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return db, nil
}

// Store implements both progress and leaderboard repositories.
type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func (s *Store) GetProgress(ctx context.Context) (domain.CampaignProgress, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT highest_unlocked, completed_levels, pass_badges
		FROM campaign_progress
		WHERE id = 1
	`)

	var highest int
	var completedJSON, badgesJSON string
	if err := row.Scan(&highest, &completedJSON, &badgesJSON); err != nil {
		return domain.CampaignProgress{}, fmt.Errorf("scan progress: %w", err)
	}

	completed, err := decodeLevels(completedJSON)
	if err != nil {
		return domain.CampaignProgress{}, err
	}
	badges, err := decodeLevels(badgesJSON)
	if err != nil {
		return domain.CampaignProgress{}, err
	}

	return domain.CampaignProgress{
		HighestUnlocked: highest,
		CompletedLevels: completed,
		PassBadges:      badges,
	}, nil
}

func (s *Store) SaveProgress(ctx context.Context, progress domain.CampaignProgress) (domain.CampaignProgress, error) {
	progress = progress.Normalize()

	completedJSON, err := json.Marshal(progress.CompletedLevels)
	if err != nil {
		return domain.CampaignProgress{}, fmt.Errorf("encode completed levels: %w", err)
	}
	badgesJSON, err := json.Marshal(progress.PassBadges)
	if err != nil {
		return domain.CampaignProgress{}, fmt.Errorf("encode pass badges: %w", err)
	}

	_, err = s.db.ExecContext(ctx, `
		UPDATE campaign_progress
		SET highest_unlocked = ?, completed_levels = ?, pass_badges = ?, updated_at = ?
		WHERE id = 1
	`, progress.HighestUnlocked, string(completedJSON), string(badgesJSON), time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		return domain.CampaignProgress{}, fmt.Errorf("save progress: %w", err)
	}

	return progress, nil
}

func (s *Store) ListTop(ctx context.Context, limit int) ([]domain.LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 10
	}

	rows, err := s.db.QueryContext(ctx, `
		SELECT id, initials, score, active_traffic_ms, created_at
		FROM leaderboard_entries
		ORDER BY score DESC, active_traffic_ms DESC, created_at ASC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("list leaderboard: %w", err)
	}
	defer rows.Close()

	entries := make([]domain.LeaderboardEntry, 0, limit)
	for rows.Next() {
		var entry domain.LeaderboardEntry
		var createdAt string
		if err := rows.Scan(&entry.ID, &entry.Initials, &entry.Score, &entry.ActiveTrafficMs, &createdAt); err != nil {
			return nil, fmt.Errorf("scan leaderboard row: %w", err)
		}
		parsed, err := time.Parse(time.RFC3339, createdAt)
		if err != nil {
			return nil, fmt.Errorf("parse created_at: %w", err)
		}
		entry.CreatedAt = parsed
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate leaderboard: %w", err)
	}

	return entries, nil
}

func (s *Store) Submit(ctx context.Context, submission domain.LeaderboardSubmission) (domain.LeaderboardEntry, error) {
	initials := domain.NormalizeInitials(submission.Initials)
	createdAt := time.Now().UTC().Format(time.RFC3339)

	result, err := s.db.ExecContext(ctx, `
		INSERT INTO leaderboard_entries (initials, score, active_traffic_ms, created_at)
		VALUES (?, ?, ?, ?)
	`, initials, submission.Score, submission.ActiveTrafficMs, createdAt)
	if err != nil {
		return domain.LeaderboardEntry{}, fmt.Errorf("insert leaderboard: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return domain.LeaderboardEntry{}, fmt.Errorf("leaderboard id: %w", err)
	}

	parsed, err := time.Parse(time.RFC3339, createdAt)
	if err != nil {
		return domain.LeaderboardEntry{}, fmt.Errorf("parse created_at: %w", err)
	}

	return domain.LeaderboardEntry{
		ID:              id,
		Initials:        initials,
		Score:           submission.Score,
		ActiveTrafficMs: submission.ActiveTrafficMs,
		CreatedAt:       parsed,
	}, nil
}

func decodeLevels(raw string) ([]string, error) {
	if raw == "" {
		return []string{}, nil
	}
	var levels []string
	if err := json.Unmarshal([]byte(raw), &levels); err != nil {
		return nil, fmt.Errorf("decode levels json: %w", err)
	}
	if levels == nil {
		return []string{}, nil
	}
	return levels, nil
}
