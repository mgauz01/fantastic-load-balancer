package domain

// CampaignProgress is the persisted campaign unlock and completion state.
type CampaignProgress struct {
	HighestUnlocked int      `json:"highestUnlocked"`
	CompletedLevels []string `json:"completedLevels"`
	PassBadges      []string `json:"passBadges"`
}

// DefaultCampaignProgress returns a fresh campaign with level 1 unlocked.
func DefaultCampaignProgress() CampaignProgress {
	return CampaignProgress{
		HighestUnlocked: 1,
		CompletedLevels: []string{},
		PassBadges:      []string{},
	}
}

const MaxCampaignLevel = 8

// Normalize applies unlock rules after a client update.
func (p CampaignProgress) Normalize() CampaignProgress {
	if p.HighestUnlocked < 1 {
		p.HighestUnlocked = 1
	}
	if p.HighestUnlocked > MaxCampaignLevel {
		p.HighestUnlocked = MaxCampaignLevel
	}

	completed := uniqueSortedLevels(p.CompletedLevels)
	badges := uniqueSortedLevels(p.PassBadges)

	for _, levelID := range completed {
		if next := levelIndex(levelID) + 1; next > p.HighestUnlocked && next <= MaxCampaignLevel {
			p.HighestUnlocked = next
		}
	}

	p.CompletedLevels = completed
	p.PassBadges = badges
	return p
}

func uniqueSortedLevels(levels []string) []string {
	seen := make(map[string]struct{}, len(levels))
	out := make([]string, 0, len(levels))
	for _, level := range levels {
		if level == "" {
			continue
		}
		if _, ok := seen[level]; ok {
			continue
		}
		seen[level] = struct{}{}
		out = append(out, level)
	}
	return out
}

func levelIndex(levelID string) int {
	const prefix = "level_"
	if len(levelID) <= len(prefix) {
		return 0
	}
	var n int
	for _, ch := range levelID[len(prefix):] {
		if ch < '0' || ch > '9' {
			return 0
		}
		n = n*10 + int(ch-'0')
	}
	return n
}
