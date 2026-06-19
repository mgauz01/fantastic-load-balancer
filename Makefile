.PHONY: build web-build web-dev web-dev-urls test go-test web-test clean run run-server tunnel tunnel-server wsl-urls

BINARY := flb-server
GO := go
NPM := npm
PORT ?= 5173
SERVER_PORT ?= 8080

build: web-build
	$(GO) build -o $(BINARY) ./cmd/server

web-build:
	cd web && $(NPM) ci && $(NPM) run build
	rm -rf internal/server/static/dist
	mkdir -p internal/server/static
	cp -r web/dist internal/server/static/dist

web-dev:
	cd web && $(NPM) run dev

web-dev-urls:
	PORT=5173 ./scripts/wsl-urls.sh

web-install:
	cd web && $(NPM) ci

go-test:
	$(GO) test ./...

web-test:
	cd web && $(NPM) run test

test: go-test web-test

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
