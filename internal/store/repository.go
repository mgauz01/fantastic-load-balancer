package store

import (
	"context"

	"github.com/fantastic-load-balancer/flb/internal/domain"
)

// ProgressRepository persists campaign unlock and completion state.
type ProgressRepository interface {
	GetProgress(ctx context.Context) (domain.CampaignProgress, error)
	SaveProgress(ctx context.Context, progress domain.CampaignProgress) (domain.CampaignProgress, error)
}

// LeaderboardRepository persists arcade high scores.
type LeaderboardRepository interface {
	ListTop(ctx context.Context, limit int) ([]domain.LeaderboardEntry, error)
	Submit(ctx context.Context, submission domain.LeaderboardSubmission) (domain.LeaderboardEntry, error)
}
