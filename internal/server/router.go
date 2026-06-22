package server

import (
	"io/fs"
	"log"
	"net/http"
	"strings"

	"github.com/fantastic-load-balancer/flb/internal/api"
	"github.com/fantastic-load-balancer/flb/internal/store"
)

// Dependencies wires API handlers to their repositories.
type Dependencies struct {
	Progress    store.ProgressRepository
	Leaderboard store.LeaderboardRepository
}

// NewHandler returns the HTTP router with API routes and embedded SPA fallback.
func NewHandler(deps Dependencies) (http.Handler, error) {
	static, err := fs.Sub(WebDist, "static/dist")
	if err != nil {
		return nil, err
	}

	progressHandler := api.NewProgressHandler(deps.Progress)
	leaderboardHandler := api.NewLeaderboardHandler(deps.Leaderboard)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", healthHandler)
	mux.HandleFunc("GET /api/progress", progressHandler.Get)
	mux.HandleFunc("PUT /api/progress", progressHandler.Put)
	mux.HandleFunc("GET /api/leaderboard", leaderboardHandler.Get)
	mux.HandleFunc("POST /api/leaderboard", leaderboardHandler.Post)

	fileServer := http.FileServer(http.FS(static))
	return recoverMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/health" {
			mux.ServeHTTP(w, r)
			return
		}
		spaHandler(static, fileServer)(w, r)
	})), nil
}

func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("panic: %v", recovered)
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			}
		}()
		next.ServeHTTP(w, r)
	})
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
}

func spaHandler(static fs.FS, fileServer http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			fileServer.ServeHTTP(w, r)
			return
		}

		if _, err := fs.Stat(static, path); err == nil {
			fileServer.ServeHTTP(w, r)
			return
		}

		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	}
}
