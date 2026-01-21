package handlers

import (
	"net/http"

	"github.com/code-100-precent/LingFramework/pkg/config"
	"github.com/code-100-precent/LingFramework/pkg/llm"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GenerateChapterRequest 生成章节请求
type GenerateChapterRequest struct {
	Title           string   `json:"title" binding:"required"`
	NovelTitle      string   `json:"novelTitle"`
	NovelGenre      string   `json:"novelGenre"`
	WorldSetting    string   `json:"worldSetting"`
	StyleGuide      string   `json:"styleGuide"`
	Outline         string   `json:"outline"`
	Characters      []string `json:"characters"`
	PlotPoints      []string `json:"plotPoints"`
	PreviousSummary string   `json:"previousSummary"`
	ChapterNumber   int      `json:"chapterNumber"`
	TargetWordCount int      `json:"targetWordCount"`
	WritingStyle    string   `json:"writingStyle"`
	FocusPoints     []string `json:"focusPoints"`
	AvoidComplete   bool     `json:"avoidComplete"`
}

// GenerateChapter 生成章节
// @Summary 生成章节
// @Description 使用 AI 生成章节内容
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateChapterRequest true "生成请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chapter/generate [post]
func (h *AIHandler) GenerateChapter(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req GenerateChapterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Generating chapter",
		zap.String("title", req.Title),
		zap.Int("chapterNumber", req.ChapterNumber))

	result, err := h.chapterGenerator.Generate(llm.ChapterGenerateRequest{
		Title:           req.Title,
		NovelTitle:      req.NovelTitle,
		NovelGenre:      req.NovelGenre,
		WorldSetting:    req.WorldSetting,
		StyleGuide:      req.StyleGuide,
		Outline:         req.Outline,
		Characters:      req.Characters,
		PlotPoints:      req.PlotPoints,
		PreviousSummary: req.PreviousSummary,
		ChapterNumber:   req.ChapterNumber,
		TargetWordCount: req.TargetWordCount,
		WritingStyle:    req.WritingStyle,
		FocusPoints:     req.FocusPoints,
		AvoidComplete:   req.AvoidComplete,
	})

	if err != nil {
		logger.Error("Failed to generate chapter",
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

// GenerateChapterSummaryRequest 生成章节摘要请求
type GenerateChapterSummaryRequest struct {
	Title   string `json:"title" binding:"required"`
	Content string `json:"content" binding:"required"`
}

// GenerateChapterSuggestionsRequest 生成章节建议请求
type GenerateChapterSuggestionsRequest struct {
	NovelTitle      string `json:"novelTitle" binding:"required"`
	NovelGenre      string `json:"novelGenre"`
	WorldSetting    string `json:"worldSetting"`
	PreviousSummary string `json:"previousSummary"`
	ChapterNumber   int    `json:"chapterNumber"`
}

// ChapterSuggestion 章节建议
type ChapterSuggestion struct {
	Title       string `json:"title"`       // 建议标题
	Outline     string `json:"outline"`     // 建议大纲
	Description string `json:"description"` // 发展方向描述
	Type        string `json:"type"`        // 类型：action/emotion/plot/mystery等
}

// GenerateChapterSummary 生成章节摘要
// @Summary 生成章节摘要
// @Description 为章节生成摘要，用于上下文压缩
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateChapterSummaryRequest true "摘要请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chapter/summary [post]
func (h *AIHandler) GenerateChapterSummary(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req GenerateChapterSummaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	result, err := h.chapterGenerator.GenerateSummary(req.Title, req.Content)
	if err != nil {
		logger.Error("Failed to generate summary",
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
		"data": gin.H{
			"summary": result,
		},
	})
}

// GenerateChapterSuggestions 生成章节建议
// @Summary 生成章节建议
// @Description 根据前文摘要生成多个可能的后续章节建议
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateChapterSuggestionsRequest true "章节建议请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chapter/suggestions [post]
func (h *AIHandler) GenerateChapterSuggestions(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req GenerateChapterSuggestionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	suggestions, err := h.chapterGenerator.GenerateSuggestions(llm.ChapterSuggestionsRequest{
		NovelTitle:      req.NovelTitle,
		NovelGenre:      req.NovelGenre,
		WorldSetting:    req.WorldSetting,
		PreviousSummary: req.PreviousSummary,
		ChapterNumber:   req.ChapterNumber,
	})
	if err != nil {
		logger.Error("Failed to generate chapter suggestions",
			zap.String("novelTitle", req.NovelTitle),
			zap.Int("chapterNumber", req.ChapterNumber),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "生成失败: " + err.Error(),
		})
		return
	}

	// 验证建议数量
	if len(suggestions) == 0 {
		logger.Warn("No suggestions generated",
			zap.String("novelTitle", req.NovelTitle),
			zap.Int("chapterNumber", req.ChapterNumber))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "生成失败: 未能生成有效的章节建议",
		})
		return
	}

	logger.Info("Successfully generated chapter suggestions",
		zap.String("novelTitle", req.NovelTitle),
		zap.Int("chapterNumber", req.ChapterNumber),
		zap.Int("suggestionCount", len(suggestions)))

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "生成成功",
		"data": gin.H{
			"suggestions": suggestions,
		},
	})
}

// GenerateChapterOutlineRequest 生成章节大纲请求
type GenerateChapterOutlineRequest struct {
	Title           string   `json:"title" binding:"required"`
	NovelTitle      string   `json:"novelTitle"`
	NovelGenre      string   `json:"novelGenre"`
	PreviousSummary string   `json:"previousSummary"`
	PlotPoints      []string `json:"plotPoints"`
	ChapterNumber   int      `json:"chapterNumber"`
}

// GenerateChapterOutline 生成章节大纲
// @Summary 生成章节大纲
// @Description 为章节生成详细大纲
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateChapterOutlineRequest true "大纲请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chapter/outline [post]
func (h *AIHandler) GenerateChapterOutline(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req GenerateChapterOutlineRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	result, err := h.chapterGenerator.GenerateOutline(llm.ChapterGenerateRequest{
		Title:           req.Title,
		NovelTitle:      req.NovelTitle,
		NovelGenre:      req.NovelGenre,
		PreviousSummary: req.PreviousSummary,
		PlotPoints:      req.PlotPoints,
		ChapterNumber:   req.ChapterNumber,
	})

	if err != nil {
		logger.Error("Failed to generate outline",
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
		"data": gin.H{
			"outline": result,
		},
	})
}

// RefineChapterContentRequest 优化章节内容请求
type RefineChapterContentRequest struct {
	Title           string `json:"title" binding:"required"`
	OriginalContent string `json:"originalContent" binding:"required"`
	Feedback        string `json:"feedback" binding:"required"`
}

// RefineChapterContent 根据反馈优化章节内容
// @Summary 优化章节内容
// @Description 根据反馈意见优化章节内容
// @Tags AI
// @Accept json
// @Produce json
// @Param request body RefineChapterContentRequest true "优化请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chapter/refine [post]
func (h *AIHandler) RefineChapterContent(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req RefineChapterContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	result, err := h.chapterGenerator.RefineContent(req.Title, req.OriginalContent, req.Feedback)
	if err != nil {
		logger.Error("Failed to refine content",
			zap.String("title", req.Title),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "优化失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "优化成功",
		"data": gin.H{
			"content": result,
		},
	})
}

// ExpandContentRequest 扩写内容请求
type ExpandContentRequest struct {
	OriginalContent string `json:"originalContent"`
	ExpandTarget    string `json:"expandTarget" binding:"required"`
	ExpandHint      string `json:"expandHint"`
	NovelGenre      string `json:"novelGenre"`
	WorldSetting    string `json:"worldSetting"`
	StyleGuide      string `json:"styleGuide"`
}

// ExpandContent 扩写内容
// @Summary 扩写内容
// @Description 对指定段落进行扩写
// @Tags AI
// @Accept json
// @Produce json
// @Param request body ExpandContentRequest true "扩写请求"
// @Success 200 {object} map[string]interface{}
// @Router /api/ai/chapter/expand [post]
func (h *AIHandler) ExpandContent(c *gin.Context) {
	if config.GlobalConfig.LLMApiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"code": 503,
			"msg":  "AI 功能未配置，请联系管理员",
		})
		return
	}

	var req ExpandContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	result, err := h.chapterGenerator.ExpandContent(llm.ExpandContentRequest{
		OriginalContent: req.OriginalContent,
		ExpandTarget:    req.ExpandTarget,
		ExpandHint:      req.ExpandHint,
		NovelGenre:      req.NovelGenre,
		WorldSetting:    req.WorldSetting,
		StyleGuide:      req.StyleGuide,
	})

	if err != nil {
		logger.Error("Failed to expand content",
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
			"content": result,
		},
	})
}
