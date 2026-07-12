# Fantastic Load Balancer

[![CI](https://github.com/mgauz01/fantastic-load-balancer/actions/workflows/ci.yml/badge.svg)](https://github.com/mgauz01/fantastic-load-balancer/actions/workflows/ci.yml)

Educational Layer 7 load balancing game: configure routing rules, watch simulated HTTP traffic, and keep your backends healthy.

## Features

- **Campaign** — 8 progressive levels with pass/fail scoring and SQLite-backed unlocks
- **Endless Arcade** — spawn ramp, backend failures, streak scoring, and local leaderboard (unlocks after campaign level 3)
- **Client-side sim** — TypeScript tick engine (routing, sticky sessions, health, metrics)
- **Single binary** — Go server embeds the production React build

## Prerequisites

| Tool | Version |
|------|---------|
| Go | 1.23+ |
| Node.js | 22+ |
| npm | 10+ (bundled with Node 22) |

**Browsers:** Chrome, Firefox, Edge, or Safari — last two major versions on desktop or tablet.

## Quick start

### Production build (embedded SPA)

```bash
make build
./flb-server -version
./flb-server
```

Open [http://localhost:8080](http://localhost:8080) (or use the WSL2 / tunnel flow below).

> **Note:** `go test ./...` and `go build` require embedded web assets. Run `make web-build` first (or use `make build`, which runs it automatically).

### Data directory

SQLite stores campaign progress and arcade scores at `./data/flb.db` by default.

| Override | Example |
|----------|---------|
| Flag | `./flb-server -data-dir /var/lib/flb` |
| Env | `FLB_DATA_DIR=/var/lib/flb ./flb-server` |

The directory is created on first run if it does not exist.

### WSL2 → Windows browser

The app runs in WSL2; open it from **Windows** (Edge/Chrome), not a browser inside Linux.

**Option A — tunnel (recommended if localhost does not work)**

Terminal 1 — start the app:

```bash
# Dev with HMR (preferred while coding)
make run-server          # Go API on :8080 (terminal 1)
make web-dev             # Vite on :5173 (terminal 2)

# Or production binary (single server)
make run                 # embedded SPA on :8080
```

Terminal 2 — expose the port to Windows:

```bash
make tunnel              # tunnels Vite :5173 (dev)
# or
make tunnel-server       # tunnels flb-server :8080 (production run)
```

Open the printed `https://…` URL in your **Windows** browser.  
Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) for the most reliable tunnel (HTTPS + WebSockets for Vite HMR). Without it, `make tunnel` falls back to `localtunnel` via `npx`.

**Option B — direct URL**

```bash
make wsl-urls            # dev (5173)
make wsl-urls PORT=8080  # production server
```

Try `http://localhost:<port>` from Windows first, then the WSL IP if shown.

Servers bind `0.0.0.0` so they are reachable from outside the WSL VM when networking allows it.

### Development

```bash
make dev    # prints the two-terminal workflow
```

Terminal 1 — Go API (after first web embed, or use Vite proxy only):

```bash
make web-build   # once, or after frontend changes you want embedded
make run-server  # listens on 0.0.0.0:8080
```

Terminal 2 — Vite dev server with HMR:

```bash
make web-dev
```

Terminal 3 (if needed) — tunnel for Windows browser:

```bash
make tunnel
```

Vite proxies `/api` and `/health` to the Go server on `127.0.0.1:8080`.
<!-- Consider extracting to function -->

## Commands

| Command | Description |
|---------|-------------|
| `make build` | Embed web assets and compile `flb-server` (git version via `-ldflags`) |
| `make run` | Build and start server on `0.0.0.0:8080` |
| `make run-server` | Start Go server without rebuild (dev) |
| `make web-dev` | Start Vite dev server (`0.0.0.0:5173`) |
| `make web-build` | Build SPA and copy into `internal/server/static/dist` |
| `make test` | Run Go and web unit tests |
| `make vet` | Run `go vet ./...` |
| `make typecheck` | Run `tsc --noEmit` in `web/` |
| `make tunnel` | Public HTTPS tunnel to Vite `:5173` (Windows browser) |
| `make tunnel-server` | Public HTTPS tunnel to `flb-server` `:8080` |
| `make wsl-urls` | Print localhost / WSL IP URLs for Windows |
| `make version` | Print the version string used at link time |
| `./flb-server -version` | Print running binary version |

## CI

GitHub Actions runs on every push/PR to `main` and `dev`:

- **Web** — `npm test`, `tsc --noEmit`, Vite production build
- **Server matrix** — Ubuntu, macOS, and Windows: embed assets, `go vet`, `go test`, `go build`, `-version` smoke test

## Project layout

| Path | Purpose |
|------|---------|
| `cmd/server/` | Go HTTP server entrypoint |
| `internal/` | API handlers, SQLite store, embedded static files |
| `web/` | React + TypeScript SPA and sim engine |
| `content/levels/` | Campaign level JSON |
| `scripts/embed-web.sh` | Cross-platform embed step used by Make and CI |

## Docs (local reference)

Gameplay rules and tuning live in `CONTEXT.md`, `STRATEGY.md`, and `CONCEPTS.md`. Implementation plan: `docs/plans/2026-06-19-002-feat-l7-load-balancer-web-app-plan.md`.

## License

TBD
