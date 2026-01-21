package handlers

import (
	"net/http"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GeneratePlotRequest 生成情节请求
type GeneratePlotRequest struct {
	Title        string `json:"title" binding:"required"`
	NovelTitle   string `json:"novelTitle"`
	NovelGenre   string `json:"novelGenre"`
	WorldSetting string `json:"worldSetting"`
	Characters   string `json:"characters"`
	PlotType     string `json:"plotType"`
	Context      string `json:"context"`
}

// GeneratePlot 生成情节
// @Summary 生成情节
// @Description 使用 AI 生成情节的完整设定
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GeneratePlotRequest true "生成请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/plot/generate [post]
func (h *AIHandler) GeneratePlot(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req GeneratePlotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Generating plot",
		zap.String("title", req.Title),
		zap.String("plotType", req.PlotType))

	result, err := h.plotGenerator.Generate(llm.PlotGenerateRequest{
		Title:        req.Title,
		NovelTitle:   req.NovelTitle,
		NovelGenre:   req.NovelGenre,
		WorldSetting: req.WorldSetting,
		Characters:   req.Characters,
		PlotType:     req.PlotType,
		Context:      req.Context,
	})

	if err != nil {
		logger.Error("Failed to generate plot",
			zap.String("title", req.Title),
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

// EnhancePlotContentRequest 增强情节内容请求
type EnhancePlotContentRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

// EnhancePlotContent 增强情节内容
// @Summary 增强情节内容
// @Description 使用 AI 优化和扩展情节内容
// @Tags AI
// @Accept json
// @Produce json
// @Param request body EnhancePlotContentRequest true "增强请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/plot/enhance [post]
func (h *AIHandler) EnhancePlotContent(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req EnhancePlotContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Enhancing plot content",
		zap.String("title", req.Title))

	result, err := h.plotGenerator.EnhanceContent(req.Title, req.Content)
	if err != nil {
		logger.Error("Failed to enhance plot content",
			zap.String("title", req.Title),
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
			"content": result,
		},
	})
}
