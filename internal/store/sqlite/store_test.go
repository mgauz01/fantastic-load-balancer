package sqlite_test

import (
	"context"
	"path/filepath"
	"testing"

	"github.com/fantastic-load-balancer/flb/internal/domain"
	"github.com/fantastic-load-balancer/flb/internal/store/sqlite"
)

func TestSQLiteProgressAndLeaderboard(t *testing.T) {
	t.Parallel()

	dbPath := filepath.Join(t.TempDir(), "flb.db")
	db, err := sqlite.Open(dbPath)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	store := sqlite.NewStore(db)
	ctx := context.Background()

	progress, err := store.GetProgress(ctx)
	if err != nil {
		t.Fatalf("GetProgress: %v", err)
	}
	if progress.HighestUnlocked != 1 {
		t.Fatalf("default highestUnlocked = %d, want 1", progress.HighestUnlocked)
	}

	saved, err := store.SaveProgress(ctx, domain.CampaignProgress{
		HighestUnlocked: 1,
		CompletedLevels: []string{"level_02"},
		PassBadges:      []string{"level_02"},
	})
	if err != nil {
		t.Fatalf("SaveProgress: %v", err)
	}
	if saved.HighestUnlocked != 3 {
		t.Fatalf("saved highestUnlocked = %d, want 3", saved.HighestUnlocked)
	}

	entry, err := store.Submit(ctx, domain.LeaderboardSubmission{
		Initials:        "LB",
		Score:           900,
		ActiveTrafficMs: 45000,
	})
	if err != nil {
		t.Fatalf("Submit: %v", err)
	}
	if entry.Initials != "LBA" {
		t.Fatalf("initials = %q, want LBA", entry.Initials)
	}

	entries, err := store.ListTop(ctx, 5)
	if err != nil {
		t.Fatalf("ListTop: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("entries len = %d, want 1", len(entries))
	}
}
