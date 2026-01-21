package config

import (
	"log"
	"os"

	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/LingByte/LingDialog/pkg/utils"
	"github.com/LingByte/lingstorage-sdk-go"
)

// Config represents the system configuration
type Config struct {
	MachineID            int64  `env:"MACHINE_ID"`
	ServerName           string `env:"SERVER_NAME"`
	ServerDesc           string `env:"SERVER_DESC"`
	ServerUrl            string `env:"SERVER_URL"`
	ServerLogo           string `env:"SERVER_LOGO"`
	ServerTermsUrl       string `env:"SERVER_TERMS_URL"`
	DBDriver             string `env:"DB_DRIVER"`
	DSN                  string `env:"DSN"`
	Log                  logger.LogConfig
	Addr                 string `env:"ADDR"`
	Mode                 string `env:"MODE"`
	DocsPrefix           string `env:"DOCS_PREFIX"`
	APIPrefix            string `env:"API_PREFIX"`
	AdminPrefix          string `env:"ADMIN_PREFIX"`
	AuthPrefix           string `env:"AUTH_PREFIX"`
	SessionSecret        string `env:"SESSION_SECRET"`
	SecretExpireDays     string `env:"SESSION_EXPIRE_DAYS"`
	LLMProvider          string `env:"LLM_PROVIDER"`
	LLMApiKey            string `env:"LLM_API_KEY"`
	LLMBaseURL           string `env:"LLM_BASE_URL"`
	LLMModel             string `env:"LLM_MODEL"`
	OllamaBaseURL        string `env:"OLLAMA_BASE_URL"`
	OllamaModel          string `env:"OLLAMA_MODEL"`
	SearchEnabled        bool   `env:"SEARCH_ENABLED"`
	SearchPath           string `env:"SEARCH_PATH"`
	SearchBatchSize      int    `env:"SEARCH_BATCH_SIZE"`
	MonitorPrefix        string `env:"MONITOR_PREFIX"`
	LanguageEnabled      bool   `env:"LANGUAGE_ENABLED"`
	APISecretKey         string `env:"API_SECRET_KEY"`
	BackupEnabled        bool   `env:"BACKUP_ENABLED"`
	BackupPath           string `env:"BACKUP_PATH"`
	BackupSchedule       string `env:"BACKUP_SCHEDULE"`
	SSLEnabled           bool   `env:"SSL_ENABLED"`
	SSLCertFile          string `env:"SSL_CERT_FILE"`
	SSLKeyFile           string `env:"SSL_KEY_FILE"`
	LingstorageBaseUrl   string `env:"LINGSTORAGE_BASE_URL"`
	LingstorageApiKey    string `env:"LINGSTORAGE_API_KEY"`
	LingstorageApiSecret string `env:"LINGSTORAGE_API_SECRET"`
	LingstorageBucket    string `env:"LINGSTORAGE_BUCKET"`
}

// GlobalConfig is the global configuration instance
var GlobalConfig *Config

// GlobalStore is the global lingstorage client instance
var GlobalStore *lingstorage.Client

// Load loads configuration from environment variables
func Load() error {
	// Load .env file based on APP_ENV
	env := os.Getenv("APP_ENV")
	err := utils.LoadEnv(env)
	if err != nil {
		// Log warning if .env file not found, but don't fail startup
		log.Printf("Note: .env file not found or failed to load: %v (using default values)", err)
	}

	// Load global configuration
	GlobalConfig = &Config{
		MachineID:        utils.GetIntEnv("MACHINE_ID"),
		ServerName:       getStringOrDefault("SERVER_NAME", ""),
		ServerDesc:       getStringOrDefault("SERVER_DESC", ""),
		ServerUrl:        getStringOrDefault("SERVER_URL", ""),
		ServerLogo:       getStringOrDefault("SERVER_LOGO", ""),
		ServerTermsUrl:   getStringOrDefault("SERVER_TERMS_URL", ""),
		DBDriver:         getStringOrDefault("DB_DRIVER", "sqlite"),
		DSN:              getStringOrDefault("DSN", "./ling.db"),
		Addr:             getStringOrDefault("ADDR", ":7072"),
		Mode:             getStringOrDefault("MODE", "development"),
		DocsPrefix:       getStringOrDefault("DOCS_PREFIX", "/api/docs"),
		APIPrefix:        getStringOrDefault("API_PREFIX", "/api"),
		AdminPrefix:      getStringOrDefault("ADMIN_PREFIX", "/admin"),
		AuthPrefix:       getStringOrDefault("AUTH_PREFIX", "/auth"),
		SecretExpireDays: getStringOrDefault("SESSION_EXPIRE_DAYS", "7"),
		SessionSecret:    getStringOrDefault("SESSION_SECRET", generateDefaultSessionSecret()),
		Log: logger.LogConfig{
			Level:      getStringOrDefault("LOG_LEVEL", "info"),
			Filename:   getStringOrDefault("LOG_FILENAME", "./logs/app.log"),
			MaxSize:    getIntOrDefault("LOG_MAX_SIZE", 100),
			MaxAge:     getIntOrDefault("LOG_MAX_AGE", 30),
			MaxBackups: getIntOrDefault("LOG_MAX_BACKUPS", 5),
			Daily:      getBoolOrDefault("LOG_DAILY", true),
		},
		LLMProvider:          getStringOrDefault("LLM_PROVIDER", "openai"),
		LLMApiKey:            getStringOrDefault("LLM_API_KEY", getStringOrDefault("OPENAI_API_KEY", "")),
		LLMBaseURL:           getStringOrDefault("LLM_BASE_URL", getStringOrDefault("OPENAI_BASE_URL", "https://api.openai.com/v1")),
		LLMModel:             getStringOrDefault("LLM_MODEL", getStringOrDefault("OPENAI_MODEL", "gpt-3.5-turbo")),
		OllamaBaseURL:        getStringOrDefault("OLLAMA_BASE_URL", "http://localhost:11434"),
		OllamaModel:          getStringOrDefault("OLLAMA_MODEL", "llama2"),
		SearchEnabled:        getBoolOrDefault("SEARCH_ENABLED", false),
		SearchPath:           getStringOrDefault("SEARCH_PATH", "./search"),
		SearchBatchSize:      getIntOrDefault("SEARCH_BATCH_SIZE", 100),
		MonitorPrefix:        getStringOrDefault("MONITOR_PREFIX", "/metrics"),
		LanguageEnabled:      getBoolOrDefault("LANGUAGE_ENABLED", true),
		APISecretKey:         getStringOrDefault("API_SECRET_KEY", generateDefaultSessionSecret()),
		BackupEnabled:        getBoolOrDefault("BACKUP_ENABLED", false),
		BackupPath:           getStringOrDefault("BACKUP_PATH", "./backups"),
		BackupSchedule:       getStringOrDefault("BACKUP_SCHEDULE", "0 2 * * *"),
		SSLEnabled:           getBoolOrDefault("SSL_ENABLED", false),
		SSLCertFile:          getStringOrDefault("SSL_CERT_FILE", ""),
		SSLKeyFile:           getStringOrDefault("SSL_KEY_FILE", ""),
		LingstorageBaseUrl:   getStringOrDefault("LINGSTORAGE_BASE_URL", ""),
		LingstorageApiKey:    getStringOrDefault("LINGSTORAGE_API_KEY", ""),
		LingstorageApiSecret: getStringOrDefault("LINGSTORAGE_API_SECRET", ""),
		LingstorageBucket:    getStringOrDefault("LINGSTORAGE_BUCKET", ""),
	}

	// Initialize lingstorage client if configured
	if GlobalConfig.LingstorageBaseUrl != "" && GlobalConfig.LingstorageApiKey != "" {
		GlobalStore = lingstorage.NewClient(&lingstorage.Config{
			BaseURL:   GlobalConfig.LingstorageBaseUrl,
			APIKey:    GlobalConfig.LingstorageApiKey,
			APISecret: GlobalConfig.LingstorageApiSecret,
		})
		log.Printf("LingStorage client initialized successfully")
	} else {
		log.Printf("LingStorage not configured, skipping client initialization")
	}

	return nil
}

// getStringOrDefault gets environment variable value, returns default if empty
func getStringOrDefault(key, defaultValue string) string {
	value := utils.GetEnv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getBoolOrDefault gets boolean environment variable value, returns default if empty
func getBoolOrDefault(key string, defaultValue bool) bool {
	value := utils.GetEnv(key)
	if value == "" {
		return defaultValue
	}
	return utils.GetBoolEnv(key)
}

// getIntOrDefault gets integer environment variable value, returns default if zero
func getIntOrDefault(key string, defaultValue int) int {
	value := utils.GetIntEnv(key)
	if value == 0 {
		return defaultValue
	}
	return int(value)
}

// generateDefaultSessionSecret generates a default session secret for development only
// This should only be called when SESSION_SECRET is not set in environment
func generateDefaultSessionSecret() string {
	// Generate a random string for development use only
	return "default-secret-key-change-in-production-" + utils.RandText(16)
}

// GetLLMConfig 获取当前 LLM 配置
// 根据 LLM_PROVIDER 返回相应的配置
func GetLLMConfig() (apiKey, baseURL, model string) {
	provider := GlobalConfig.LLMProvider

	switch provider {
	case "ollama":
		// Ollama 不需要 API Key
		return "", GlobalConfig.OllamaBaseURL, GlobalConfig.OllamaModel
	case "openai":
		fallthrough
	default:
		// 默认使用 OpenAI 兼容配置
		return GlobalConfig.LLMApiKey, GlobalConfig.LLMBaseURL, GlobalConfig.LLMModel
	}
}

// IsOllamaProvider 检查是否使用 Ollama 提供商
func IsOllamaProvider() bool {
	return GlobalConfig.LLMProvider == "ollama"
}
