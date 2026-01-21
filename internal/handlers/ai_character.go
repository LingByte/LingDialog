package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GenerateCharacterRequest 生成角色请求
type GenerateCharacterRequest struct {
	Name        string `json:"name" binding:"required"`
	NovelTitle  string `json:"novelTitle"`
	NovelGenre  string `json:"novelGenre"`
	Role        string `json:"role"`
	Personality string `json:"personality"`
	Background  string `json:"background"`
}

// GenerateCharacter 生成角色
// @Summary 生成角色
// @Description 使用 AI 生成角色的完整设定
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateCharacterRequest true "生成请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/character/generate [post]
func (h *AIHandler) GenerateCharacter(c *gin.Context) {
	if !checkLLMConfigured(c) {
		return
	}

	var req GenerateCharacterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Generating character",
		zap.String("name", req.Name),
		zap.String("role", req.Role))

	result, err := h.characterGenerator.Generate(llm.CharacterGenerateRequest{
		Name:        req.Name,
		NovelTitle:  req.NovelTitle,
		NovelGenre:  req.NovelGenre,
		Role:        req.Role,
		Personality: req.Personality,
		Background:  req.Background,
	})

	if err != nil {
		logger.Error("Failed to generate character",
			zap.String("name", req.Name),
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

// GenerateCharacterStream 流式生成角色
// @Summary 流式生成角色
// @Description 使用 AI 流式生成角色的完整设定
// @Tags AI
// @Accept json
// @Produce text/event-stream
// @Param request body GenerateCharacterRequest true "生成请求"
// @Success 200 {string} string "SSE stream"
// @Router /api/ai/character/generate-stream [post]
func (h *AIHandler) GenerateCharacterStream(c *gin.Context) {
	if !checkLLMConfigured(c) {
		return
	}

	var req GenerateCharacterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Generating character (stream)",
		zap.String("name", req.Name),
		zap.String("role", req.Role))

	// 设置 SSE 响应头
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Transfer-Encoding", "chunked")

	// 创建回调函数来发送流式数据
	callback := func(segment string, isComplete bool) error {
		if isComplete {
			c.SSEvent("complete", "")
			c.Writer.Flush()
			return nil
		}

		c.SSEvent("data", segment)
		c.Writer.Flush()
		return nil
	}

	result, err := h.characterGenerator.GenerateStream(llm.CharacterGenerateRequest{
		Name:        req.Name,
		NovelTitle:  req.NovelTitle,
		NovelGenre:  req.NovelGenre,
		Role:        req.Role,
		Personality: req.Personality,
		Background:  req.Background,
	}, callback)

	if err != nil {
		logger.Error("Failed to generate character (stream)",
			zap.String("name", req.Name),
			zap.Error(err))
		c.SSEvent("error", err.Error())
		c.Writer.Flush()
		return
	}

	// 发送最终结果
	resultJSON, _ := json.Marshal(result)
	c.SSEvent("result", string(resultJSON))
	c.Writer.Flush()
}

// EnhanceDescriptionRequest 增强描述请求
type EnhanceDescriptionRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description" binding:"required"`
}

// EnhanceDescription 增强角色描述
// @Summary 增强角色描述
// @Description 使用 AI 优化和扩展角色描述
// @Tags AI
// @Accept json
// @Produce json
// @Param request body EnhanceDescriptionRequest true "增强请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/character/enhance [post]
func (h *AIHandler) EnhanceDescription(c *gin.Context) {
	if !checkLLMConfigured(c) {
		return
	}

	var req EnhanceDescriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Enhancing character description",
		zap.String("name", req.Name))

	result, err := h.characterGenerator.EnhanceDescription(req.Name, req.Description)
	if err != nil {
		logger.Error("Failed to enhance description",
			zap.String("name", req.Name),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "增强失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "增强成功",
		"data": gin.H{
			"description": result,
		},
	})
}

// SuggestRelationshipsRequest 建议关系请求
type SuggestRelationshipsRequest struct {
	Character1   string `json:"character1" binding:"required"`
	Description1 string `json:"description1" binding:"required"`
	Character2   string `json:"character2" binding:"required"`
	Description2 string `json:"description2" binding:"required"`
}

// SuggestRelationships 建议角色关系
// @Summary 建议角色关系
// @Description 使用 AI 分析两个角色之间可能的关系
// @Tags AI
// @Accept json
// @Produce json
// @Param request body SuggestRelationshipsRequest true "关系请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/character/relationships [post]
func (h *AIHandler) SuggestRelationships(c *gin.Context) {
	if !checkLLMConfigured(c) {
		return
	}

	var req SuggestRelationshipsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Suggesting character relationships",
		zap.String("character1", req.Character1),
		zap.String("character2", req.Character2))

	result, err := h.characterGenerator.SuggestRelationships(
		req.Character1, req.Character2,
		req.Description1, req.Description2,
	)
	if err != nil {
		logger.Error("Failed to suggest relationships",
			zap.String("character1", req.Character1),
			zap.String("character2", req.Character2),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "分析失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "分析成功",
		"data": gin.H{
			"suggestion": result,
		},
	})
}
