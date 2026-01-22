package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/logger"
	"go.uber.org/zap"
)

// Handler LLM通用处理器
type Handler struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// NewHandler 创建LLM处理器
func NewHandler(apiKey, baseURL, model string) *Handler {
	return &Handler{
		apiKey:  apiKey,
		baseURL: baseURL,
		model:   model,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// GenerateText 生成文本
func (h *Handler) GenerateText(prompt string, temperature float64, maxTokens int) (string, error) {
	// 构建请求体
	requestBody := map[string]interface{}{
		"model": h.model,
		"messages": []map[string]string{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"temperature": temperature,
		"max_tokens":  maxTokens,
	}

	// 如果是Ollama，调整请求格式
	if config.IsOllamaProvider() {
		requestBody = map[string]interface{}{
			"model":  h.model,
			"prompt": prompt,
			"stream": false,
			"options": map[string]interface{}{
				"temperature": temperature,
				"num_predict": maxTokens,
			},
		}
	}

	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %v", err)
	}

	// 构建请求URL
	url := h.baseURL
	if config.IsOllamaProvider() {
		url += "/api/generate"
	} else {
		url += "/v1/chat/completions"
	}

	// 创建请求
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %v", err)
	}

	// 设置请求头
	req.Header.Set("Content-Type", "application/json")
	if !config.IsOllamaProvider() && h.apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+h.apiKey)
	}

	// 发送请求
	logger.Debug("发送LLM请求",
		zap.String("url", url),
		zap.String("model", h.model),
		zap.Float64("temperature", temperature),
		zap.Int("maxTokens", maxTokens))

	resp, err := h.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("LLM API错误 (状态码: %d): %s", resp.StatusCode, string(body))
	}

	// 解析响应
	if config.IsOllamaProvider() {
		return h.parseOllamaResponse(body)
	} else {
		return h.parseOpenAIResponse(body)
	}
}

// parseOpenAIResponse 解析OpenAI格式的响应
func (h *Handler) parseOpenAIResponse(body []byte) (string, error) {
	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("解析响应失败: %v", err)
	}

	if response.Error.Message != "" {
		return "", fmt.Errorf("LLM错误: %s", response.Error.Message)
	}

	if len(response.Choices) == 0 {
		return "", fmt.Errorf("响应中没有生成内容")
	}

	return response.Choices[0].Message.Content, nil
}

// parseOllamaResponse 解析Ollama格式的响应
func (h *Handler) parseOllamaResponse(body []byte) (string, error) {
	var response struct {
		Response string `json:"response"`
		Error    string `json:"error"`
	}

	if err := json.Unmarshal(body, &response); err != nil {
		return "", fmt.Errorf("解析响应失败: %v", err)
	}

	if response.Error != "" {
		return "", fmt.Errorf("Ollama错误: %s", response.Error)
	}

	return response.Response, nil
}
