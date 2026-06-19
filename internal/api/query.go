package api

import (
	"net/http"
	"strconv"
)

func parseLimit(r *http.Request, defaultLimit int) int {
	raw := r.URL.Query().Get("limit")
	if raw == "" {
		return defaultLimit
	}

	limit, err := strconv.Atoi(raw)
	if err != nil || limit <= 0 {
		return defaultLimit
	}
	if limit > 100 {
		return 100
	}
	return limit
}
