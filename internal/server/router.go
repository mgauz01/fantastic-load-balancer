package server

import (
	"io/fs"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewHandler returns the HTTP router with API routes and embedded SPA fallback.
func NewHandler() (http.Handler, error) {
	static, err := fs.Sub(WebDist, "static/dist")
	if err != nil {
		return nil, err
	}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", healthHandler)

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

		// Client-side routes: serve index.html
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	}
}
