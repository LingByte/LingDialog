package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/LingByte/LingDialog/internal/models"
	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
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
	NovelID     *int          `json:"novelId"`                     // 小说 ID（可选）
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

	// 如果指定了小说 ID，添加小说上下文
	if req.NovelID != nil {
		contextMessage, err := h.buildNovelContext(*req.NovelID)
		if err != nil {
			logger.Error("Failed to build novel context", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{
				"code": 500,
				"msg":  "获取小说信息失败: " + err.Error(),
			})
			return
		}
		if contextMessage != nil {
			// 将上下文消息插入到消息列表开头
			messages = append([]llm.Message{*contextMessage}, messages...)
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

	// 如果指定了小说 ID，添加小说上下文
	if req.NovelID != nil {
		contextMessage, err := h.buildNovelContext(*req.NovelID)
		if err != nil {
			logger.Error("Failed to build novel context", zap.Error(err))
			c.SSEvent("error", "获取小说信息失败: "+err.Error())
			return
		}
		if contextMessage != nil {
			// 将上下文消息插入到消息列表开头
			messages = append([]llm.Message{*contextMessage}, messages...)
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

// buildNovelContext 构建小说上下文信息
func (h *AIHandler) buildNovelContext(novelID int) (*llm.Message, error) {
	// 获取小说基本信息
	var novel models.Novel
	if err := h.db.First(&novel, novelID).Error; err != nil {
		return nil, fmt.Errorf("小说不存在")
	}

	// 获取角色信息
	var characters []models.Character
	h.db.Where("novel_id = ?", novelID).Find(&characters)

	// 获取情节点信息
	var plotPoints []models.PlotPoint
	h.db.Where("novel_id = ?", novelID).Find(&plotPoints)

	// 获取最近的章节信息（最多5章）
	var chapters []models.Chapter
	h.db.Where("novel_id = ?", novelID).
		Order("order DESC").
		Limit(5).
		Find(&chapters)

	// 构建上下文内容
	var contextParts []string

	// 基本信息
	contextParts = append(contextParts, fmt.Sprintf("# 小说信息\n标题：%s", novel.Title))
	if novel.Genre != "" {
		contextParts = append(contextParts, fmt.Sprintf("类型：%s", novel.Genre))
	}
	if novel.Description != "" {
		contextParts = append(contextParts, fmt.Sprintf("简介：%s", novel.Description))
	}
	if novel.WorldSetting != "" {
		contextParts = append(contextParts, fmt.Sprintf("世界设定：%s", novel.WorldSetting))
	}
	if novel.StyleGuide != "" {
		contextParts = append(contextParts, fmt.Sprintf("写作风格：%s", novel.StyleGuide))
	}

	// 角色信息
	if len(characters) > 0 {
		contextParts = append(contextParts, "\n# 主要角色")
		for _, char := range characters {
			contextParts = append(contextParts, fmt.Sprintf("- %s：%s", char.Name, char.Description))
		}
	}

	// 情节点信息
	if len(plotPoints) > 0 {
		contextParts = append(contextParts, "\n# 重要情节点")
		for _, plot := range plotPoints {
			contextParts = append(contextParts, fmt.Sprintf("- %s：%s", plot.Title, plot.Content))
		}
	}

	// 最近章节信息
	if len(chapters) > 0 {
		contextParts = append(contextParts, "\n# 最近章节")
		// 按顺序排列（从早到晚）
		for i := len(chapters) - 1; i >= 0; i-- {
			chapter := chapters[i]
			contextParts = append(contextParts, fmt.Sprintf("## 第%d章：%s", chapter.Order, chapter.Title))
			if chapter.Summary != "" {
				contextParts = append(contextParts, fmt.Sprintf("摘要：%s", chapter.Summary))
			}
		}
	}

	contextParts = append(contextParts, "\n# 角色设定\n你是一个专业的小说创作助手，专门帮助作者讨论和完善小说创作。请基于以上小说信息，为用户提供专业的创作建议、情节讨论和写作指导。重点关注：\n- 情节发展和走向\n- 角色成长和关系\n- 世界观构建和完善\n- 冲突设置和解决\n- 写作技巧和风格\n- 后续章节规划")

	context := strings.Join(contextParts, "\n")

	return &llm.Message{
		Role:    "system",
		Content: context,
	}, nil
}
