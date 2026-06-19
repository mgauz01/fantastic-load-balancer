package server_test

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/fantastic-load-balancer/flb/internal/server"
)

func TestHealthEndpoint(t *testing.T) {
	t.Parallel()

	handler, err := server.NewHandler()
	if err != nil {
		t.Fatalf("NewHandler: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if body := rec.Body.String(); body != "ok" {
		t.Fatalf("body = %q, want %q", body, "ok")
	}
}

func TestEmbeddedIndex(t *testing.T) {
	t.Parallel()

	handler, err := server.NewHandler()
	if err != nil {
		t.Fatalf("NewHandler: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	if !strings.Contains(rec.Body.String(), "Fantastic Load Balancer") {
		t.Fatalf("expected index.html body to contain app title")
	}
}
