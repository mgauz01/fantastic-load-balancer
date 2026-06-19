package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"

	"github.com/fantastic-load-balancer/flb/internal/config"
	"github.com/fantastic-load-balancer/flb/internal/server"
	"github.com/fantastic-load-balancer/flb/internal/store/sqlite"
)

var version = "dev"

func main() {
	fs := flag.NewFlagSet(os.Args[0], flag.ContinueOnError)
	showVersion := fs.Bool("version", false, "print version and exit")
	addr := fs.String("addr", "0.0.0.0:8080", "HTTP listen address (use 0.0.0.0 for WSL2 / Windows browser access)")
	dataDir := fs.String("data-dir", config.DefaultDataDir(), "directory for SQLite database files")
	if err := fs.Parse(os.Args[1:]); err != nil {
		log.Fatalf("flags: %v", err)
	}

	if *showVersion {
		fmt.Println(version)
		os.Exit(0)
	}

	cfg := config.Config{
		Addr:    *addr,
		DataDir: *dataDir,
	}
	if env := os.Getenv("FLB_DATA_DIR"); env != "" {
		cfg.DataDir = env
	}

	db, err := sqlite.Open(cfg.DBPath())
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	store := sqlite.NewStore(db)
	handler, err := server.NewHandler(server.Dependencies{
		Progress:    store,
		Leaderboard: store,
	})
	if err != nil {
		log.Fatalf("server init: %v", err)
	}

	log.Printf("flb-server %s listening on %s (db: %s)", version, cfg.Addr, cfg.DBPath())
	printAccessHints(cfg.Addr)

	if err := http.ListenAndServe(cfg.Addr, handler); err != nil {
		log.Fatalf("listen: %v", err)
	}
}

func printAccessHints(addr string) {
	port := portFromAddr(addr)
	if port == "" {
		return
	}

	log.Println("")
	log.Println("Access from your Windows browser (WSL2):")
	log.Printf("  http://localhost:%s  (if WSL localhost forwarding is enabled)", port)

	if ip := wslPrimaryIP(); ip != "" {
		log.Printf("  http://%s:%s  (WSL IP)", ip, port)
	}

	log.Printf("  Or run: make tunnel-server  → public URL via cloudflared/localtunnel")
	log.Println("")
}

func portFromAddr(addr string) string {
	_, port, err := net.SplitHostPort(addr)
	if err != nil {
		if strings.HasPrefix(addr, ":") {
			return strings.TrimPrefix(addr, ":")
		}
		return ""
	}
	return port
}

func wslPrimaryIP() string {
	if os.Getenv("WSL_DISTRO_NAME") == "" {
		return ""
	}

	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ""
	}

	for _, addr := range addrs {
		ipNet, ok := addr.(*net.IPNet)
		if !ok || ipNet.IP.IsLoopback() {
			continue
		}
		ip4 := ipNet.IP.To4()
		if ip4 == nil {
			continue
		}
		return ip4.String()
	}

	return ""
}
