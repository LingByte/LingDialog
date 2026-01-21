package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/code-100-precent/LingFramework/pkg/llm"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// ChatMessage 聊天消息
type ChatMessage struct {
	Role    string `json:"role"`    // user, assistant, system
	Content string `json:"content"` // 消息内容
}

// ChatRequest 聊天请求
type ChatRequest struct {
	Messages    []ChatMessage `json:"messages" binding:"required"` // 对话历史
	Stream      bool          `json:"stream"`                      // 是否流式返回
	Temperature float32       `json:"temperature"`                 // 温度参数 0-1
	MaxTokens   int           `json:"maxTokens"`                   // 最大 token 数
}

// ChatResponse 聊天响应
type ChatResponse struct {
	Message ChatMessage `json:"message"` // AI 回复消息
	Usage   struct {
		PromptTokens     int `json:"promptTokens"`
		CompletionTokens int `json:"completionTokens"`
		TotalTokens      int `json:"totalTokens"`
	} `json:"usage,omitempty"`
}

// Chat 普通聊天接口
// @Summary AI 对话
// @Description 与 AI 进行对话交流
// @Tags AI
// @Accept json
// @Produce json
// @Param request body ChatRequest true "聊天请求"
// @Success 200 {object} ChatResponse
// @Router /api/ai/chat [post]
func (h *AIHandler) Chat(c *gin.Context) {
	if !checkLLMConfigured(c) {
		return
	}

	var req ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	// 验证消息列表
	if len(req.Messages) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "消息列表不能为空",
		})
		return
	}

	logger.Info("Chat request received",
		zap.Int("messageCount", len(req.Messages)),
		zap.Bool("stream", req.Stream))

	// 如果是流式请求，使用流式处理
	if req.Stream {
		h.chatStream(c, req)
		return
	}

	// 非流式请求
	h.chatNormal(c, req)
}

// chatNormal 普通聊天（非流式）
func (h *AIHandler) chatNormal(c *gin.Context, req ChatRequest) {
	// 构建消息列表
	messages := make([]llm.Message, len(req.Messages))
	for i, msg := range req.Messages {
		messages[i] = llm.Message{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// 调用 LLM
	response, err := h.characterGenerator.Chat(messages, req.Temperature, req.MaxTokens)
	if err != nil {
		logger.Error("Chat failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "对话失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "success",
		"data": ChatResponse{
			Message: ChatMessage{
				Role:    "assistant",
				Content: response,
			},
		},
	})
}

// chatStream 流式聊天
func (h *AIHandler) chatStream(c *gin.Context, req ChatRequest) {
	// 设置 SSE 响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")
	c.Header("X-Accel-Buffering", "no")

	// 构建消息列表
	messages := make([]llm.Message, len(req.Messages))
	for i, msg := range req.Messages {
		messages[i] = llm.Message{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// 创建流式回调
	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "流式传输不支持",
		})
		return
	}

	callback := func(segment string, isComplete bool) error {
		if isComplete {
			c.SSEvent("done", "[DONE]")
			flusher.Flush()
			return nil
		}

		// 发送数据块
		data := map[string]interface{}{
			"content": segment,
		}
		jsonData, _ := json.Marshal(data)
		c.SSEvent("message", string(jsonData))
		flusher.Flush()
		return nil
	}

	// 调用流式 LLM
	_, err := h.characterGenerator.ChatStream(messages, req.Temperature, req.MaxTokens, callback)
	if err != nil {
		logger.Error("Chat stream failed", zap.Error(err))
		c.SSEvent("error", err.Error())
		flusher.Flush()
		return
	}
}

// ClearHistory 清除对话历史
// @Summary 清除对话历史
// @Description 清除用户的对话历史记录
// @Tags AI
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chat/clear [post]
func (h *AIHandler) ClearHistory(c *gin.Context) {
	// 这里可以实现清除数据库中的对话历史
	// 目前只返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "对话历史已清除",
	})
}
