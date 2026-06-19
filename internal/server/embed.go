package server

import "embed"

// WebDist holds the production Vite build output.
// Run `make web-build` to populate internal/server/static/dist before `go build`.
//
//go:embed all:static/dist
var WebDist embed.FS
