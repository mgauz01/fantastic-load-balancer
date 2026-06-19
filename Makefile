.PHONY: build web-build web-dev web-dev-urls test go-test web-test vet typecheck clean run run-server tunnel tunnel-server wsl-urls dev version

BINARY := flb-server
GO := go
NPM := npm
PORT ?= 5173
SERVER_PORT ?= 8080
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
GO_LDFLAGS := -X main.version=$(VERSION)

build: web-build
	$(GO) build -ldflags "$(GO_LDFLAGS)" -o $(BINARY) ./cmd/server

web-build:
	bash scripts/embed-web.sh

web-dev:
	cd web && $(NPM) run dev

web-dev-urls:
	PORT=5173 ./scripts/wsl-urls.sh

web-install:
	cd web && $(NPM) ci

go-test:
	$(GO) test ./...

vet:
	$(GO) vet ./...

typecheck:
	cd web && npx tsc --noEmit

web-test:
	cd web && $(NPM) run test

test: go-test web-test

dev:
	@echo "Start two terminals:"
	@echo "  1) make run-server"
	@echo "  2) make web-dev"
	@echo "Optional: make tunnel (Windows browser via HTTPS)"

version:
	@echo $(VERSION)

run: build
	./$(BINARY) -addr 0.0.0.0:$(SERVER_PORT)

run-server:
	$(GO) run ./cmd/server -addr 0.0.0.0:$(SERVER_PORT)

tunnel:
	chmod +x scripts/tunnel.sh
	./scripts/tunnel.sh $(PORT)

tunnel-server:
	chmod +x scripts/tunnel.sh
	./scripts/tunnel.sh $(SERVER_PORT)

wsl-urls:
	chmod +x scripts/wsl-urls.sh
	PORT=$(PORT) ./scripts/wsl-urls.sh

clean:
	rm -f $(BINARY)
	rm -rf web/dist web/node_modules internal/server/static/dist
