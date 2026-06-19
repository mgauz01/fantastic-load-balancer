package config

import (
	"flag"
	"os"
	"path/filepath"
)

// Config holds runtime server configuration.
type Config struct {
	Addr    string
	DataDir string
}

// DefaultDataDir returns the default SQLite data directory.
func DefaultDataDir() string {
	return filepath.Join(".", "data")
}

// DBPath returns the SQLite database file path inside DataDir.
func (c Config) DBPath() string {
	return filepath.Join(c.DataDir, "flb.db")
}

// LoadFromFlags parses standard server flags into Config.
func LoadFromFlags(fs *flag.FlagSet, args []string) (Config, error) {
	cfg := Config{
		Addr:    "0.0.0.0:8080",
		DataDir: DefaultDataDir(),
	}

	if fs == nil {
		fs = flag.NewFlagSet("server", flag.ContinueOnError)
	}

	showVersion := fs.Bool("version", false, "print version and exit")
	addr := fs.String("addr", cfg.Addr, "HTTP listen address")
	dataDir := fs.String("data-dir", cfg.DataDir, "directory for SQLite database files")

	if err := fs.Parse(args); err != nil {
		return Config{}, err
	}

	if *showVersion {
		return Config{}, ErrShowVersion
	}

	cfg.Addr = *addr
	cfg.DataDir = *dataDir

	if env := os.Getenv("FLB_DATA_DIR"); env != "" {
		cfg.DataDir = env
	}

	return cfg, nil
}

// ErrShowVersion signals that the process should print version and exit.
var ErrShowVersion = errShowVersion{}

type errShowVersion struct{}

func (errShowVersion) Error() string { return "show version" }
