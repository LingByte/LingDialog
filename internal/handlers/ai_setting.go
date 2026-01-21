package handlers

import (
	"net/http"

	"github.com/code-100-precent/LingFramework/pkg/config"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GenerateSettingRequest AI 生成设定请求
type GenerateSettingRequest struct {
	NovelID      int    `json:"novelId" binding:"required"`
	NovelTitle   string `json:"novelTitle"`
	NovelGenre   string `json:"novelGenre"`
	Category     string `json:"category" binding:"required"` // world, power, tech, concept, rule, org, item, other
	Title        string `json:"title"`                       // 可选，AI 可以生成
	Context      string `json:"context"`                     // 背景信息
	Requirements string `json:"requirements"`                // 具体要求
}

// EnhanceSettingRequest 完善设定请求
type EnhanceSettingRequest struct {
	Title       string `json:"title" binding:"required"`
	Content     string `json:"content" binding:"required"`
	EnhanceHint string `json:"enhanceHint"` // 完善提示
}

// GenerateSetting AI 生成设定
// @Summary 生成设定
// @Description 使用 AI 生成小说设定
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateSettingRequest true "生成请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/setting/generate [post]
func (h *AIHandler) GenerateSetting(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req GenerateSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Generating setting",
		zap.Int("novelId", req.NovelID),
		zap.String("category", req.Category),
		zap.String("title", req.Title))

	title, content, tags, err := h.settingGenerator.Generate(
		req.NovelTitle,
		req.NovelGenre,
		req.Category,
		req.Title,
		req.Context,
		req.Requirements,
	)

	if err != nil {
		logger.Error("Failed to generate setting",
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
		"data": gin.H{
			"title":   title,
			"content": content,
			"tags":    tags,
		},
	})
}

// EnhanceSetting 完善设定内容
// @Summary 完善设定
// @Description 使用 AI 完善设定内容
// @Tags AI
// @Accept json
// @Produce json
// @Param request body EnhanceSettingRequest true "完善请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/setting/enhance [post]
func (h *AIHandler) EnhanceSetting(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req EnhanceSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Enhancing setting",
		zap.String("title", req.Title))

	content, err := h.settingGenerator.EnhanceSetting(req.Title, req.Content, req.EnhanceHint)
	if err != nil {
		logger.Error("Failed to enhance setting",
			zap.String("title", req.Title),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "完善失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "完善成功",
		"data": gin.H{
			"content": content,
		},
	})
}
