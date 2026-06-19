package domain

import (
	"strings"
	"time"
	"unicode"
)

// LeaderboardEntry is a persisted arcade high score.
type LeaderboardEntry struct {
	ID              int64     `json:"id"`
	Initials        string    `json:"initials"`
	Score           int       `json:"score"`
	ActiveTrafficMs int64     `json:"activeTrafficMs"`
	CreatedAt       time.Time `json:"createdAt"`
}

// LeaderboardSubmission is the POST body for a new score.
type LeaderboardSubmission struct {
	Initials        string `json:"initials"`
	Score           int    `json:"score"`
	ActiveTrafficMs int64  `json:"activeTrafficMs"`
}

// NormalizeInitials pads or truncates to three uppercase letters.
func NormalizeInitials(raw string) string {
	var letters strings.Builder
	for _, r := range strings.ToUpper(raw) {
		if unicode.IsLetter(r) {
			letters.WriteRune(r)
		}
	}

	normalized := letters.String()
	for len(normalized) < 3 {
		normalized += "A"
	}
	if len(normalized) > 3 {
		normalized = normalized[:3]
	}
	return normalized
}
