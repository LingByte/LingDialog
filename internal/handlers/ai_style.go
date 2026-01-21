package handlers

import (
	"net/http"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AnalyzeStyleRequest 分析风格请求
type AnalyzeStyleRequest struct {
	NovelTitle    string `json:"novelTitle" binding:"required"`
	NovelGenre    string `json:"novelGenre"`
	ReferenceText string `json:"referenceText" binding:"required"`
}

// AnalyzeStyle 分析小说风格
// @Summary 分析小说风格
// @Description 分析参考小说的写作风格
// @Tags AI
// @Accept json
// @Produce json
// @Param request body AnalyzeStyleRequest true "分析请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/style/analyze [post]
func (h *AIHandler) AnalyzeStyle(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req AnalyzeStyleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Analyzing style",
		zap.String("novelTitle", req.NovelTitle),
		zap.Int("textLength", len(req.ReferenceText)))

	// 提取样本（智能采样）
	samples := h.styleAnalyzer.ExtractSamples(req.ReferenceText, 3)

	// 分析风格
	result, err := h.styleAnalyzer.AnalyzeStyle(llm.StyleAnalysisRequest{
		NovelTitle: req.NovelTitle,
		NovelGenre: req.NovelGenre,
		Samples:    samples,
	})

	if err != nil {
		logger.Error("Failed to analyze style",
			zap.String("novelTitle", req.NovelTitle),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "分析失败: " + err.Error(),
		})
		return
	}

	// 生成风格指南
	styleGuide := h.styleAnalyzer.GenerateStyleGuide(result)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "分析成功",
		"data": gin.H{
			"analysis":   result,
			"styleGuide": styleGuide,
		},
	})
}

// ExtractSamplesRequest 提取样本请求
type ExtractSamplesRequest struct {
	ReferenceText string `json:"referenceText" binding:"required"`
	SampleCount   int    `json:"sampleCount"`
}

// ExtractSamples 提取代表性样本
// @Summary 提取样本
// @Description 从长篇小说中提取代表性样本
// @Tags AI
// @Accept json
// @Produce json
// @Param request body ExtractSamplesRequest true "提取请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/style/extract-samples [post]
func (h *AIHandler) ExtractSamples(c *gin.Context) {
	var req ExtractSamplesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	if req.SampleCount <= 0 {
		req.SampleCount = 3
	}

	samples := h.styleAnalyzer.ExtractSamples(req.ReferenceText, req.SampleCount)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "提取成功",
		"data": gin.H{
			"samples": samples,
			"count":   len(samples),
		},
	})
}
