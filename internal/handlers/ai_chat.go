package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/LingByte/LingDialog/internal/models"
	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/LingByte/LingDialog/pkg/middleware"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ChatMessage 聊天消息
type ChatMessage struct {
	Role    string `json:"role"`    // user, assistant, system
	Content string `json:"content"` // 消息内容
}

// ChatRequest 聊天请求
type ChatRequest struct {
	SessionID   *uint         `json:"sessionId"`                   // 会话ID（可选，不传则创建新会话）
	Messages    []ChatMessage `json:"messages" binding:"required"` // 对话历史
	Stream      bool          `json:"stream"`                      // 是否流式返回
	Temperature float32       `json:"temperature"`                 // 温度参数 0-1
	MaxTokens   int           `json:"maxTokens"`                   // 最大 token 数
	NovelID     *uint         `json:"novelId"`                     // 小说 ID（可选）
	Title       string        `json:"title"`                       // 会话标题（可选）
}

// ChatResponse 聊天响应
type ChatResponse struct {
	SessionID uint        `json:"sessionId"` // 会话ID
	Message   ChatMessage `json:"message"`   // AI 回复消息
	Usage     struct {
		PromptTokens     int `json:"promptTokens"`
		CompletionTokens int `json:"completionTokens"`
		TotalTokens      int `json:"totalTokens"`
	} `json:"usage,omitempty"`
}

// SessionListRequest 会话列表请求
type SessionListRequest struct {
	Page     int    `form:"page,default=1"`
	PageSize int    `form:"pageSize,default=20"`
	NovelID  *uint  `form:"novelId"`
	Status   string `form:"status,default=active"`
}

// SessionListResponse 会话列表响应
type SessionListResponse struct {
	Sessions []models.ChatSession `json:"sessions"`
	Total    int64                `json:"total"`
	Page     int                  `json:"page"`
	PageSize int                  `json:"pageSize"`
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

	// 获取用户ID
	user := middleware.GetCurrentUser(c)

	logger.Info("Chat request received",
		zap.Int("messageCount", len(req.Messages)),
		zap.Bool("stream", req.Stream),
		zap.Any("sessionId", req.SessionID))

	// 如果是流式请求，使用流式处理
	if req.Stream {
		h.chatStream(c, req, user.ID)
		return
	}

	// 非流式请求
	h.chatNormal(c, req, user.ID)
}

// chatNormal 普通聊天（非流式）
func (h *AIHandler) chatNormal(c *gin.Context, req ChatRequest, userID uint) {
	startTime := time.Now()

	// 获取或创建会话
	session, err := h.getOrCreateSession(req.SessionID, userID, req.NovelID, req.Title)
	if err != nil {
		logger.Error("Failed to get or create session", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建会话失败: " + err.Error(),
		})
		return
	}

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

	responseTime := time.Since(startTime).Milliseconds()

	// 保存用户消息
	lastUserMsg := req.Messages[len(req.Messages)-1]
	userMessage := models.ChatMessage{
		SessionID:    session.ID,
		Role:         lastUserMsg.Role,
		Content:      lastUserMsg.Content,
		Model:        h.characterGenerator.GetModel(),
		Temperature:  req.Temperature,
		MaxTokens:    req.MaxTokens,
		ResponseTime: responseTime,
	}
	h.db.Create(&userMessage)

	// 保存AI回复消息（这里需要实际的token统计）
	assistantMessage := models.ChatMessage{
		SessionID:        session.ID,
		Role:             "assistant",
		Content:          response,
		Model:            h.characterGenerator.GetModel(),
		Temperature:      req.Temperature,
		MaxTokens:        req.MaxTokens,
		ResponseTime:     responseTime,
		PromptTokens:     0, // TODO: 从LLM响应中获取实际值
		CompletionTokens: 0, // TODO: 从LLM响应中获取实际值
		TotalTokens:      0, // TODO: 从LLM响应中获取实际值
	}
	h.db.Create(&assistantMessage)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "success",
		"data": ChatResponse{
			SessionID: session.ID,
			Message: ChatMessage{
				Role:    "assistant",
				Content: response,
			},
		},
	})
}

// chatStream 流式聊天
func (h *AIHandler) chatStream(c *gin.Context, req ChatRequest, userID uint) {
	// 设置 SSE 响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")
	c.Header("X-Accel-Buffering", "no")

	startTime := time.Now()

	// 获取或创建会话
	session, err := h.getOrCreateSession(req.SessionID, userID, req.NovelID, req.Title)
	if err != nil {
		logger.Error("Failed to get or create session", zap.Error(err))
		c.SSEvent("error", "创建会话失败: "+err.Error())
		return
	}

	// 发送会话ID
	sessionData := map[string]interface{}{
		"sessionId": session.ID,
	}
	sessionJson, _ := json.Marshal(sessionData)
	c.SSEvent("session", string(sessionJson))

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

	var fullResponse strings.Builder
	callback := func(segment string, isComplete bool) error {
		if isComplete {
			responseTime := time.Since(startTime).Milliseconds()

			// 保存用户消息
			lastUserMsg := req.Messages[len(req.Messages)-1]
			userMessage := models.ChatMessage{
				SessionID:    session.ID,
				Role:         lastUserMsg.Role,
				Content:      lastUserMsg.Content,
				Model:        h.characterGenerator.GetModel(),
				Temperature:  req.Temperature,
				MaxTokens:    req.MaxTokens,
				ResponseTime: responseTime,
			}
			h.db.Create(&userMessage)

			// 保存AI回复消息
			assistantMessage := models.ChatMessage{
				SessionID:        session.ID,
				Role:             "assistant",
				Content:          fullResponse.String(),
				Model:            h.characterGenerator.GetModel(),
				Temperature:      req.Temperature,
				MaxTokens:        req.MaxTokens,
				ResponseTime:     responseTime,
				PromptTokens:     0, // TODO: 从LLM响应中获取实际值
				CompletionTokens: 0, // TODO: 从LLM响应中获取实际值
				TotalTokens:      0, // TODO: 从LLM响应中获取实际值
			}
			h.db.Create(&assistantMessage)

			c.SSEvent("done", "[DONE]")
			flusher.Flush()
			return nil
		}

		fullResponse.WriteString(segment)

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
	_, err = h.characterGenerator.ChatStream(messages, req.Temperature, req.MaxTokens, callback)
	if err != nil {
		logger.Error("Chat stream failed", zap.Error(err))
		c.SSEvent("error", err.Error())
		flusher.Flush()
		return
	}
}

// GetSessions 获取用户的聊天会话列表
// @Summary 获取聊天会话列表
// @Description 获取用户的聊天会话列表
// @Tags AI
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param pageSize query int false "每页数量" default(20)
// @Param novelId query int false "小说ID"
// @Param status query string false "会话状态" default(active)
// @Success 200 {object} SessionListResponse
// @Router /api/ai/chat/sessions [get]
func (h *AIHandler) GetSessions(c *gin.Context) {
	user := middleware.GetCurrentUser(c)

	var req SessionListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	query := h.db.Where("user_id = ? AND status = ?", user.ID, req.Status)
	if req.NovelID != nil {
		query = query.Where("novel_id = ?", *req.NovelID)
	}

	var total int64
	query.Model(&models.ChatSession{}).Count(&total)

	var sessions []models.ChatSession
	offset := (req.Page - 1) * req.PageSize
	query.Preload("Novel").
		Order("updated_at DESC").
		Offset(offset).
		Limit(req.PageSize).
		Find(&sessions)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "success",
		"data": SessionListResponse{
			Sessions: sessions,
			Total:    total,
			Page:     req.Page,
			PageSize: req.PageSize,
		},
	})
}

// GetSessionMessages 获取会话的消息列表
// @Summary 获取会话消息
// @Description 获取指定会话的消息列表
// @Tags AI
// @Accept json
// @Produce json
// @Param sessionId path int true "会话ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chat/sessions/{sessionId}/messages [get]
func (h *AIHandler) GetSessionMessages(c *gin.Context) {
	user := middleware.GetCurrentUser(c)

	sessionIDStr := c.Param("sessionId")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "会话ID格式错误",
		})
		return
	}

	// 验证会话所有权
	var session models.ChatSession
	if err := h.db.Where("id = ? AND user_id = ?", sessionID, user.ID).First(&session).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"code": 404,
				"msg":  "会话不存在",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code": 500,
				"msg":  "查询会话失败",
			})
		}
		return
	}

	var messages []models.ChatMessage
	h.db.Where("session_id = ?", sessionID).
		Order("created_at ASC").
		Find(&messages)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "success",
		"data": map[string]interface{}{
			"session":  session,
			"messages": messages,
		},
	})
}

// DeleteSession 删除会话
// @Summary 删除会话
// @Description 删除指定的聊天会话
// @Tags AI
// @Accept json
// @Produce json
// @Param sessionId path int true "会话ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chat/sessions/{sessionId} [delete]
func (h *AIHandler) DeleteSession(c *gin.Context) {
	user := middleware.GetCurrentUser(c)

	sessionIDStr := c.Param("sessionId")
	sessionID, err := strconv.ParseUint(sessionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "会话ID格式错误",
		})
		return
	}

	// 软删除会话（更新状态为deleted）
	result := h.db.Model(&models.ChatSession{}).
		Where("id = ? AND user_id = ?", sessionID, user.ID).
		Update("status", "deleted")

	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "删除会话失败",
		})
		return
	}

	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"code": 404,
			"msg":  "会话不存在",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "会话已删除",
	})
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
	user := middleware.GetCurrentUser(c)

	// 软删除所有会话
	h.db.Model(&models.ChatSession{}).
		Where("user_id = ?", user.ID).
		Update("status", "deleted")

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "对话历史已清除",
	})
}

// GetUsageStats 获取用户聊天使用统计
// @Summary 获取聊天使用统计
// @Description 获取用户的聊天使用统计信息
// @Tags AI
// @Accept json
// @Produce json
// @Param days query int false "统计天数" default(7)
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chat/usage [get]
func (h *AIHandler) GetUsageStats(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	daysStr := c.DefaultQuery("days", "7")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 7
	}

	// 获取最近N天的使用统计
	var usage []models.ChatUsage
	h.db.Where("user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)", user.ID, days).
		Order("date DESC").
		Find(&usage)

	// 计算总计
	var totalStats struct {
		TotalMessages int `json:"totalMessages"`
		TotalSessions int `json:"totalSessions"`
		TotalTokens   int `json:"totalTokens"`
	}

	for _, u := range usage {
		totalStats.TotalMessages += u.MessageCount
		totalStats.TotalSessions += u.SessionCount
		totalStats.TotalTokens += u.TotalTokens
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "success",
		"data": map[string]interface{}{
			"dailyUsage": usage,
			"totalStats": totalStats,
			"periodDays": days,
		},
	})
}

// getOrCreateSession 获取或创建会话
func (h *AIHandler) getOrCreateSession(sessionID *uint, userID uint, novelID *uint, title string) (*models.ChatSession, error) {
	if sessionID != nil {
		// 获取现有会话
		var session models.ChatSession
		err := h.db.Where("id = ? AND user_id = ?", *sessionID, userID).First(&session).Error
		if err == nil {
			return &session, nil
		}
		if err != gorm.ErrRecordNotFound {
			return nil, err
		}
	}

	// 创建新会话
	session := models.ChatSession{
		UserID:  userID,
		NovelID: novelID,
		Title:   title,
		Status:  "active",
	}

	if session.Title == "" {
		if novelID != nil {
			var novel models.Novel
			if err := h.db.First(&novel, *novelID).Error; err == nil {
				session.Title = fmt.Sprintf("讨论《%s》", novel.Title)
			}
		}
		if session.Title == "" {
			session.Title = "新对话"
		}
	}

	if err := h.db.Create(&session).Error; err != nil {
		return nil, err
	}

	return &session, nil
}

// buildNovelContext 构建小说上下文信息
func (h *AIHandler) buildNovelContext(novelID uint) (*llm.Message, error) {
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

	contextParts = append(contextParts, "\n# 角色设定\n你是一个专业的小说创作助手，专门帮助作者讨论和完善小说创作。请基于以上小说信息，为用户提供专业的创作建议、情节讨论和写作指导。重点关注：\n- 情节发展和走向\n- 角色成长和关系\n- 世界观构建和完善\n- 冲突设置和解决\n- 写作技巧和风格\n- 后续章节规划, 请返回纯文本，不要返回任何Markdown或者JSON")

	context := strings.Join(contextParts, "\n")

	return &llm.Message{
		Role:    "system",
		Content: context,
	}, nil
}
