package handlers

import (
	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/LingByte/LingDialog/pkg/middleware"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// AIHandler AI 相关的处理器
type AIHandler struct {
	db                 *gorm.DB
	characterGenerator *llm.CharacterGenerator
	plotGenerator      *llm.PlotGenerator
	chapterGenerator   *llm.ChapterGenerator
	styleAnalyzer      *llm.StyleAnalyzer
	storylineGenerator *llm.StorylineGenerator
	settingGenerator   *llm.SettingGenerator
}

// NewAIHandler 创建 AI 处理器
func NewAIHandler(db *gorm.DB) *AIHandler {
	// 从配置中获取 LLM 设置
	apiKey, baseURL, model := config.GetLLMConfig()

	if config.IsOllamaProvider() {
		logger.Info("LLM configured with Ollama provider",
			zap.String("llm_base_url", baseURL),
			zap.String("llm_model", model))
	} else if apiKey == "" {
		logger.Warn("LLM API key not configured, AI features will be disabled",
			zap.String("llm_provider", config.GlobalConfig.LLMProvider),
			zap.String("llm_base_url", baseURL),
			zap.String("llm_model", model))
	} else {
		logger.Info("LLM configured successfully",
			zap.String("llm_provider", config.GlobalConfig.LLMProvider),
			zap.String("llm_base_url", baseURL),
			zap.String("llm_model", model),
			zap.Bool("api_key_set", apiKey != ""))
	}

	characterGenerator := llm.NewCharacterGenerator(apiKey, baseURL, model)
	plotGenerator := llm.NewPlotGenerator(apiKey, baseURL, model)
	chapterGenerator := llm.NewChapterGenerator(apiKey, baseURL, model)
	styleAnalyzer := llm.NewStyleAnalyzer(apiKey, baseURL, model)
	storylineGenerator := llm.NewStorylineGenerator(apiKey, baseURL, model)
	settingGenerator := llm.NewSettingGenerator(apiKey, baseURL, model)

	return &AIHandler{
		db:                 db,
		characterGenerator: characterGenerator,
		plotGenerator:      plotGenerator,
		chapterGenerator:   chapterGenerator,
		styleAnalyzer:      styleAnalyzer,
		storylineGenerator: storylineGenerator,
		settingGenerator:   settingGenerator,
	}
}

// RegisterAIRoutes 注册 AI 相关路由
func RegisterAIRoutes(r *gin.RouterGroup, db *gorm.DB) {
	handler := NewAIHandler(db)

	ai := r.Group("/ai")
	ai.Use(middleware.RequireAuth()) // 添加认证中间件
	{
		// common chat
		chat := ai.Group("/chat")
		{
			chat.POST("", handler.Chat)
			chat.POST("/clear", handler.ClearHistory)
			chat.GET("/sessions", handler.GetSessions)
			chat.GET("/sessions/:sessionId/messages", handler.GetSessionMessages)
			chat.DELETE("/sessions/:sessionId", handler.DeleteSession)
			chat.GET("/usage", handler.GetUsageStats)
			// 调试端点（仅用于开发）
			chat.GET("/debug/context/:novelId", handler.DebugNovelContext)
		}

		// 小说设定生成
		novel := ai.Group("/novel")
		{
			novel.POST("/generate-setting", handler.GenerateNovelSetting)
		}

		character := ai.Group("/character")
		{
			character.POST("/generate", handler.GenerateCharacter)
			character.POST("/generate-stream", handler.GenerateCharacterStream)
			character.POST("/enhance", handler.EnhanceDescription)
			character.POST("/relationships", handler.SuggestRelationships)
		}

		plot := ai.Group("/plot")
		{
			plot.POST("/generate", handler.GeneratePlot)
			plot.POST("/enhance", handler.EnhancePlotContent)
		}

		chapter := ai.Group("/chapter")
		{
			chapter.POST("/generate", handler.GenerateChapter)
			chapter.POST("/summary", handler.GenerateChapterSummary)
			chapter.POST("/suggestions", handler.GenerateChapterSuggestions)
			chapter.POST("/outline", handler.GenerateChapterOutline)
			chapter.POST("/refine", handler.RefineChapterContent)
			chapter.POST("/expand", handler.ExpandContent)
		}

		style := ai.Group("/style")
		{
			style.POST("/analyze", handler.AnalyzeStyle)
			style.POST("/extract-samples", handler.ExtractSamples)
		}

		storyline := ai.Group("/storyline")
		{
			storyline.POST("/generate", handler.GenerateStorylines)
			storyline.POST("/optimize", handler.OptimizeStoryline)
			storyline.POST("/expand-part", handler.ExpandStorylinePart)
			storyline.POST("/expand-node", handler.ExpandStoryNode)
			storyline.POST("/suggest-connections", handler.SuggestNodeConnections)
		}

		setting := ai.Group("/setting")
		{
			setting.POST("/generate", handler.GenerateSetting)
			setting.POST("/enhance", handler.EnhanceSetting)
		}
	}
}
