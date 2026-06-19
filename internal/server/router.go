package server

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/fantastic-load-balancer/flb/internal/api"
	"github.com/fantastic-load-balancer/flb/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
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

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", healthHandler)

	r.Route("/api", func(r chi.Router) {
		r.Get("/progress", progressHandler.Get)
		r.Put("/progress", progressHandler.Put)
		r.Get("/leaderboard", leaderboardHandler.Get)
		r.Post("/leaderboard", leaderboardHandler.Post)
	})

	fileServer := http.FileServer(http.FS(static))
	r.NotFound(spaHandler(static, fileServer))

	return r, nil
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
