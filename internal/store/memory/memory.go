package memory

import (
	"context"
	"sync"
	"time"

	"github.com/fantastic-load-balancer/flb/internal/domain"
)

// ProgressStore is an in-memory ProgressRepository for tests.
type ProgressStore struct {
	mu       sync.Mutex
	progress domain.CampaignProgress
}

func NewProgressStore() *ProgressStore {
	return &ProgressStore{progress: domain.DefaultCampaignProgress()}
}

func (s *ProgressStore) GetProgress(_ context.Context) (domain.CampaignProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.progress, nil
}

func (s *ProgressStore) SaveProgress(_ context.Context, progress domain.CampaignProgress) (domain.CampaignProgress, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.progress = progress.Normalize()
	return s.progress, nil
}

// LeaderboardStore is an in-memory LeaderboardRepository for tests.
type LeaderboardStore struct {
	mu      sync.Mutex
	entries []domain.LeaderboardEntry
	nextID  int64
}

func NewLeaderboardStore() *LeaderboardStore {
	return &LeaderboardStore{nextID: 1}
}

func (s *LeaderboardStore) ListTop(_ context.Context, limit int) ([]domain.LeaderboardEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if limit <= 0 {
		limit = 10
	}

	sorted := append([]domain.LeaderboardEntry(nil), s.entries...)
	sortEntries(sorted)

	if len(sorted) > limit {
		sorted = sorted[:limit]
	}
	return sorted, nil
}

func (s *LeaderboardStore) Submit(_ context.Context, submission domain.LeaderboardSubmission) (domain.LeaderboardEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry := domain.LeaderboardEntry{
		ID:              s.nextID,
		Initials:        domain.NormalizeInitials(submission.Initials),
		Score:           submission.Score,
		ActiveTrafficMs: submission.ActiveTrafficMs,
		CreatedAt:       time.Now().UTC(),
	}
	s.nextID++
	s.entries = append(s.entries, entry)
	return entry, nil
}

func sortEntries(entries []domain.LeaderboardEntry) {
	for i := 0; i < len(entries); i++ {
		for j := i + 1; j < len(entries); j++ {
			if lessEntry(entries[j], entries[i]) {
				entries[i], entries[j] = entries[j], entries[i]
			}
		}
	}
}

func lessEntry(a, b domain.LeaderboardEntry) bool {
	if a.Score != b.Score {
		return a.Score > b.Score
	}
	return a.ActiveTrafficMs > b.ActiveTrafficMs
}
