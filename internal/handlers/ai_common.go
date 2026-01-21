package handlers

import (
	"net/http"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/gin-gonic/gin"
)

// checkLLMConfigured 检查 LLM 是否已配置
// 对于 Ollama，不需要 API key
// 对于 OpenAI 兼容 API，需要 API key
func checkLLMConfigured(c *gin.Context) bool {
	// 如果使用 Ollama，不需要检查 API key
	if config.IsOllamaProvider() {
		return true
	}

	// 对于 OpenAI 兼容 API，检查 API key
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return false
	}

	return true
}
