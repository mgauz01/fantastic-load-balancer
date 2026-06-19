package api

import (
	"encoding/json"
	"net/http"

	"github.com/fantastic-load-balancer/flb/internal/domain"
	"github.com/fantastic-load-balancer/flb/internal/store"
)

type ProgressHandler struct {
	repo store.ProgressRepository
}

func NewProgressHandler(repo store.ProgressRepository) *ProgressHandler {
	return &ProgressHandler{repo: repo}
}

func (h *ProgressHandler) Get(w http.ResponseWriter, r *http.Request) {
	progress, err := h.repo.GetProgress(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load progress")
		return
	}
	writeJSON(w, http.StatusOK, progress)
}

func (h *ProgressHandler) Put(w http.ResponseWriter, r *http.Request) {
	var progress domain.CampaignProgress
	if err := json.NewDecoder(r.Body).Decode(&progress); err != nil {
		writeError(w, http.StatusBadRequest, "invalid progress payload")
		return
	}

	saved, err := h.repo.SaveProgress(r.Context(), progress)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save progress")
		return
	}
	writeJSON(w, http.StatusOK, saved)
}

type LeaderboardHandler struct {
	repo store.LeaderboardRepository
}

func NewLeaderboardHandler(repo store.LeaderboardRepository) *LeaderboardHandler {
	return &LeaderboardHandler{repo: repo}
}

func (h *LeaderboardHandler) Get(w http.ResponseWriter, r *http.Request) {
	limit := parseLimit(r, 10)
	entries, err := h.repo.ListTop(r.Context(), limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load leaderboard")
		return
	}
	if entries == nil {
		entries = []domain.LeaderboardEntry{}
	}
	writeJSON(w, http.StatusOK, entries)
}

func (h *LeaderboardHandler) Post(w http.ResponseWriter, r *http.Request) {
	var submission domain.LeaderboardSubmission
	if err := json.NewDecoder(r.Body).Decode(&submission); err != nil {
		writeError(w, http.StatusBadRequest, "invalid leaderboard payload")
		return
	}
	if submission.Score < 0 {
		writeError(w, http.StatusBadRequest, "score must be non-negative")
		return
	}
	if submission.ActiveTrafficMs < 0 {
		writeError(w, http.StatusBadRequest, "activeTrafficMs must be non-negative")
		return
	}

	entry, err := h.repo.Submit(r.Context(), submission)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save leaderboard entry")
		return
	}
	writeJSON(w, http.StatusCreated, entry)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
