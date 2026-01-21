package handlers

import (
	"net/http"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GenerateStorylinesRequest AI 生成故事线请求
type GenerateStorylinesRequest struct {
	NovelID            int                     `json:"novelId" binding:"required"`
	NovelTitle         string                  `json:"novelTitle"`
	NovelGenre         string                  `json:"novelGenre"`
	WorldSetting       string                  `json:"worldSetting"`
	Characters         []string                `json:"characters"`
	MainConflict       string                  `json:"mainConflict"`
	StorylineCount     int                     `json:"storylineCount"`
	NodesPerLine       int                     `json:"nodesPerLine"`
	ExistingStorylines []ExistingStorylineInfo `json:"existingStorylines"` // 已有故事线
}

// ExistingStorylineInfo 已有故事线信息
type ExistingStorylineInfo struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// convertExistingStorylines 转换已有故事线信息
func convertExistingStorylines(existing []ExistingStorylineInfo) []llm.ExistingStoryline {
	result := make([]llm.ExistingStoryline, len(existing))
	for i, e := range existing {
		result[i] = llm.ExistingStoryline{
			Title:       e.Title,
			Description: e.Description,
		}
	}
	return result
}

// GenerateStorylines AI 生成故事线
// @Summary 生成故事线
// @Description 使用 AI 生成完整的故事线结构
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateStorylinesRequest true "生成请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/storyline/generate [post]
func (h *AIHandler) GenerateStorylines(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req GenerateStorylinesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Generating storylines",
		zap.Int("novelId", req.NovelID),
		zap.String("novelTitle", req.NovelTitle),
		zap.Int("storylineCount", req.StorylineCount),
		zap.Int("existingCount", len(req.ExistingStorylines)))

	result, err := h.storylineGenerator.Generate(llm.StorylineGenerateRequest{
		NovelTitle:         req.NovelTitle,
		NovelGenre:         req.NovelGenre,
		WorldSetting:       req.WorldSetting,
		Characters:         req.Characters,
		MainConflict:       req.MainConflict,
		StorylineCount:     req.StorylineCount,
		NodesPerLine:       req.NodesPerLine,
		ExistingStorylines: convertExistingStorylines(req.ExistingStorylines),
	})

	if err != nil {
		logger.Error("Failed to generate storylines",
			zap.Int("novelId", req.NovelID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "生成失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "生成成功",
		"data": result,
	})
}

// OptimizeStorylineRequest 根据意见修改故事线请求
type OptimizeStorylineRequest struct {
	CurrentDescription string `json:"currentDescription" binding:"required"` // 当前的故事线描述
	Feedback           string `json:"feedback" binding:"required"`           // 用户的修改意见
}

// ExpandStorylinePartRequest 局部扩写故事线请求
type ExpandStorylinePartRequest struct {
	FullDescription string `json:"fullDescription" binding:"required"` // 完整的故事线描述（提供上下文）
	SelectedText    string `json:"selectedText" binding:"required"`    // 用户选中要扩写的部分
	ExpandHint      string `json:"expandHint"`                         // 扩写提示（可选）
}

// OptimizeStoryline 根据意见修改故事线描述
// @Summary 根据意见修改故事线
// @Description 使用 AI 根据用户意见修改故事线描述
// @Tags AI
// @Accept json
// @Produce json
// @Param request body OptimizeStorylineRequest true "修改请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/storyline/optimize [post]
func (h *AIHandler) OptimizeStoryline(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req OptimizeStorylineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Optimizing storyline description",
		zap.Int("currentDescLength", len(req.CurrentDescription)),
		zap.String("feedback", req.Feedback))

	newDescription, err := h.storylineGenerator.OptimizeStoryline(req.CurrentDescription, req.Feedback)
	if err != nil {
		logger.Error("Failed to optimize storyline",
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "修改失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "修改成功",
		"data": gin.H{
			"description": newDescription,
		},
	})
}

// ExpandStorylinePart 局部扩写故事线
// @Summary 局部扩写故事线
// @Description 使用 AI 对故事线的选中部分进行扩写
// @Tags AI
// @Accept json
// @Produce json
// @Param request body ExpandStorylinePartRequest true "扩写请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/storyline/expand-part [post]
func (h *AIHandler) ExpandStorylinePart(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req ExpandStorylinePartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Expanding storyline part",
		zap.Int("fullDescLength", len(req.FullDescription)),
		zap.Int("selectedTextLength", len(req.SelectedText)),
		zap.String("expandHint", req.ExpandHint))

	expandedText, err := h.storylineGenerator.ExpandStorylinePart(req.FullDescription, req.SelectedText, req.ExpandHint)
	if err != nil {
		logger.Error("Failed to expand storyline part",
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "扩写失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "扩写成功",
		"data": gin.H{
			"expandedText": expandedText,
		},
	})
}

// ExpandStoryNodeRequest 扩展故事节点请求
type ExpandStoryNodeRequest struct {
	NodeTitle       string `json:"nodeTitle" binding:"required"`
	NodeDescription string `json:"nodeDescription" binding:"required"`
	Context         string `json:"context"`
}

// ExpandStoryNode 扩展故事节点内容
// @Summary 扩展故事节点
// @Description 使用 AI 扩展故事节点的详细内容
// @Tags AI
// @Accept json
// @Produce json
// @Param request body ExpandStoryNodeRequest true "扩展请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/storyline/expand-node [post]
func (h *AIHandler) ExpandStoryNode(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req ExpandStoryNodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	result, err := h.storylineGenerator.ExpandNode(req.NodeTitle, req.NodeDescription, req.Context)
	if err != nil {
		logger.Error("Failed to expand story node",
			zap.String("nodeTitle", req.NodeTitle),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "扩展失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "扩展成功",
		"data": gin.H{
			"description": result,
		},
	})
}

// SuggestNodeConnectionsRequest 建议节点连接请求
type SuggestNodeConnectionsRequest struct {
	Nodes []string `json:"nodes" binding:"required"`
}

// SuggestNodeConnections 建议节点连接
// @Summary 建议节点连接
// @Description 使用 AI 分析节点并建议连接关系
// @Tags AI
// @Accept json
// @Produce json
// @Param request body SuggestNodeConnectionsRequest true "建议请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/storyline/suggest-connections [post]
func (h *AIHandler) SuggestNodeConnections(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req SuggestNodeConnectionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	result, err := h.storylineGenerator.SuggestConnections(req.Nodes)
	if err != nil {
		logger.Error("Failed to suggest node connections",
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "建议失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "建议成功",
		"data": gin.H{
			"connections": result,
		},
	})
}
