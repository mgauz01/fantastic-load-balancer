package main

import (
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"

	"github.com/fantastic-load-balancer/flb/internal/server"
)

var version = "dev"

func main() {
	showVersion := flag.Bool("version", false, "print version and exit")
	addr := flag.String("addr", "0.0.0.0:8080", "HTTP listen address (use 0.0.0.0 for WSL2 / Windows browser access)")
	flag.Parse()

	if *showVersion {
		fmt.Println(version)
		os.Exit(0)
	}

	handler, err := server.NewHandler()
	if err != nil {
		log.Fatalf("server init: %v", err)
	}

	log.Printf("flb-server %s listening on %s", version, *addr)
	printAccessHints(*addr)

	if err := http.ListenAndServe(*addr, handler); err != nil {
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
