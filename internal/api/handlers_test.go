package api_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fantastic-load-balancer/flb/internal/domain"
	"github.com/fantastic-load-balancer/flb/internal/server"
	"github.com/fantastic-load-balancer/flb/internal/store/memory"
)

func newTestHandler(t *testing.T) http.Handler {
	t.Helper()

	progress := memory.NewProgressStore()
	leaderboard := memory.NewLeaderboardStore()

	handler, err := server.NewHandler(server.Dependencies{
		Progress:    progress,
		Leaderboard: leaderboard,
	})
	if err != nil {
		t.Fatalf("NewHandler: %v", err)
	}
	return handler
}

func TestProgressRoundTrip(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)

	putBody := domain.CampaignProgress{
		HighestUnlocked: 2,
		CompletedLevels: []string{"level_01", "level_02"},
		PassBadges:      []string{"level_01", "level_02"},
	}
	payload, err := json.Marshal(putBody)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	putReq := httptest.NewRequest(http.MethodPut, "/api/progress", bytes.NewReader(payload))
	putRec := httptest.NewRecorder()
	handler.ServeHTTP(putRec, putReq)

	if putRec.Code != http.StatusOK {
		t.Fatalf("PUT status = %d, want %d body=%s", putRec.Code, http.StatusOK, putRec.Body.String())
	}

	var saved domain.CampaignProgress
	if err := json.Unmarshal(putRec.Body.Bytes(), &saved); err != nil {
		t.Fatalf("decode PUT response: %v", err)
	}
	if saved.HighestUnlocked != 3 {
		t.Fatalf("highestUnlocked = %d, want 3 after completing level_02", saved.HighestUnlocked)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/progress", nil)
	getRec := httptest.NewRecorder()
	handler.ServeHTTP(getRec, getReq)

	if getRec.Code != http.StatusOK {
		t.Fatalf("GET status = %d, want %d", getRec.Code, http.StatusOK)
	}

	var loaded domain.CampaignProgress
	if err := json.Unmarshal(getRec.Body.Bytes(), &loaded); err != nil {
		t.Fatalf("decode GET response: %v", err)
	}
	if loaded.HighestUnlocked != 3 {
		t.Fatalf("loaded highestUnlocked = %d, want 3", loaded.HighestUnlocked)
	}
}

func TestLeaderboardAE6RoundTrip(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)

	submission := domain.LeaderboardSubmission{
		Initials:        "fl",
		Score:           420,
		ActiveTrafficMs: 91234,
	}
	payload, err := json.Marshal(submission)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	postReq := httptest.NewRequest(http.MethodPost, "/api/leaderboard", bytes.NewReader(payload))
	postRec := httptest.NewRecorder()
	handler.ServeHTTP(postRec, postReq)

	if postRec.Code != http.StatusCreated {
		t.Fatalf("POST status = %d, want %d body=%s", postRec.Code, http.StatusCreated, postRec.Body.String())
	}

	var created domain.LeaderboardEntry
	if err := json.Unmarshal(postRec.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode POST response: %v", err)
	}
	if created.Initials != "FLA" {
		t.Fatalf("initials = %q, want FLA", created.Initials)
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/leaderboard?limit=10", nil)
	getRec := httptest.NewRecorder()
	handler.ServeHTTP(getRec, getReq)

	if getRec.Code != http.StatusOK {
		t.Fatalf("GET status = %d, want %d", getRec.Code, http.StatusOK)
	}

	var entries []domain.LeaderboardEntry
	if err := json.Unmarshal(getRec.Body.Bytes(), &entries); err != nil {
		t.Fatalf("decode GET response: %v", err)
	}
	if len(entries) != 1 || entries[0].Score != 420 {
		t.Fatalf("unexpected leaderboard entries: %+v", entries)
	}
}

func TestLeaderboardRejectsNegativeScore(t *testing.T) {
	t.Parallel()

	handler := newTestHandler(t)
	payload := []byte(`{"initials":"ABC","score":-1,"activeTrafficMs":1000}`)

	req := httptest.NewRequest(http.MethodPost, "/api/leaderboard", bytes.NewReader(payload))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestNormalizeInitials(t *testing.T) {
	t.Parallel()

	if got := domain.NormalizeInitials("9x"); got != "XAA" {
		t.Fatalf("NormalizeInitials(9x) = %q, want XAA padded", got)
	}
	if got := domain.NormalizeInitials("arcade"); got != "ARC" {
		t.Fatalf("NormalizeInitials(arcade) = %q, want ARC", got)
	}
}
