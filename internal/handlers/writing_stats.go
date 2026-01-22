package handlers

import (
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/LingByte/LingDialog/internal/models"
	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/llm"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/LingByte/LingDialog/pkg/middleware"
	"github.com/LingByte/LingDialog/pkg/utils/response"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// WritingStatsHandler 写作统计处理器
type WritingStatsHandler struct {
	db *gorm.DB
}

// NewWritingStatsHandler 创建写作统计处理器
func NewWritingStatsHandler(db *gorm.DB) *WritingStatsHandler {
	return &WritingStatsHandler{db: db}
}

// GetWritingStats 获取写作统计数据
func (h *WritingStatsHandler) GetWritingStats(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		response.AbortWithStatus(c, http.StatusUnauthorized)
		return
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// 获取基础统计
	stats, err := h.calculateBasicStats(user.ID, today)
	if err != nil {
		logger.Error("计算基础统计失败", zap.Error(err))
		response.Fail(c, "获取统计数据失败", nil)
		return
	}

	// 获取或生成今日目标
	goals, err := h.getOrGenerateGoals(user.ID, today)
	if err != nil {
		logger.Error("获取写作目标失败", zap.Error(err))
		// 使用默认目标
		goals = &models.WritingGoal{
			UserID:      user.ID,
			Date:        today,
			DailyGoal:   2000,
			WeeklyGoal:  15000,
			MonthlyGoal: 80000,
		}
	}

	// 计算进度
	todayProgress := models.ProgressInfo{
		Current: stats.TodayWords,
		Target:  goals.DailyGoal,
	}

	weeklyProgress := models.ProgressInfo{
		Current: stats.WeeklyWords,
		Target:  goals.WeeklyGoal,
	}

	monthlyProgress := models.ProgressInfo{
		Current: h.getMonthlyWords(user.ID, today),
		Target:  goals.MonthlyGoal,
	}

	// 计算完成度
	completionRate := 0.0
	if goals.DailyGoal > 0 {
		completionRate = float64(stats.TodayWords) / float64(goals.DailyGoal) * 100
		if completionRate > 100 {
			completionRate = 100
		}
	}

	// 获取最近活动
	activities, err := models.GetRecentActivities(h.db, user.ID, 10)
	if err != nil {
		logger.Error("获取最近活动失败", zap.Error(err))
		activities = []models.Activity{}
	}

	result := models.WritingStats{
		TotalNovels:      stats.TotalNovels,
		TotalWords:       stats.TotalWords,
		TotalChapters:    stats.TotalChapters,
		MonthlyChapters:  stats.MonthlyChapters,
		WeeklyWords:      stats.WeeklyWords,
		TodayWords:       stats.TodayWords,
		Goals:            *goals,
		TodayProgress:    todayProgress,
		WeeklyProgress:   weeklyProgress,
		MonthlyProgress:  monthlyProgress,
		TodayChapters:    stats.TodayChapters,
		WeeklyChapters:   stats.WeeklyChapters,
		CompletionRate:   completionRate,
		RecentActivities: activities,
	}

	response.Success(c, "success", result)
}

// calculateBasicStats 计算基础统计数据
func (h *WritingStatsHandler) calculateBasicStats(userID uint, today time.Time) (*models.WritingStats, error) {
	stats := &models.WritingStats{}

	// 总小说数
	var totalNovels int64
	if err := h.db.Model(&models.Novel{}).Where("author_id = ?", userID).Count(&totalNovels).Error; err != nil {
		logger.Error("查询小说总数失败", zap.Error(err), zap.Uint("userID", userID))
		return nil, err
	}
	stats.TotalNovels = int(totalNovels)

	// 计算总字数和总章节数（所有章节）
	totalWords, totalChapters := h.calculateTotalWordsAndChapters(userID)
	stats.TotalWords = totalWords
	stats.TotalChapters = totalChapters

	// 本月章节数
	monthStart := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, today.Location())
	var monthlyChapters int64
	if err := h.db.Model(&models.Chapter{}).
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ? AND chapters.created_at >= ?", userID, monthStart).
		Count(&monthlyChapters).Error; err != nil {
		logger.Error("查询本月章节数失败", zap.Error(err), zap.Uint("userID", userID))
		monthlyChapters = 0
	}
	stats.MonthlyChapters = int(monthlyChapters)

	// 本周开始时间（周一）
	weekday := int(today.Weekday())
	if weekday == 0 { // 周日
		weekday = 7
	}
	weekStart := today.AddDate(0, 0, -(weekday - 1))

	// 按日期统计字数（今日和本周）
	todayWords := h.calculateWordsByDate(userID, today)
	weeklyWords := h.calculateWordsByDateRange(userID, weekStart, today)

	// 统计章节数
	var todayChapters int64
	var weeklyChapters int64

	// 今日章节数
	h.db.Model(&models.Chapter{}).
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ? AND DATE(chapters.created_at) = ?", userID, today.Format("2006-01-02")).
		Count(&todayChapters)

	// 本周章节数
	h.db.Model(&models.Chapter{}).
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ? AND chapters.created_at >= ?", userID, weekStart).
		Count(&weeklyChapters)

	stats.WeeklyWords = weeklyWords
	stats.WeeklyChapters = int(weeklyChapters)
	stats.TodayWords = todayWords
	stats.TodayChapters = int(todayChapters)

	logger.Info("统计数据计算完成",
		zap.Int("totalNovels", stats.TotalNovels),
		zap.Int("totalWords", stats.TotalWords),
		zap.Int("totalChapters", stats.TotalChapters),
		zap.Int("monthlyChapters", stats.MonthlyChapters),
		zap.Int("weeklyWords", stats.WeeklyWords),
		zap.Int("todayWords", stats.TodayWords),
		zap.Int("todayChapters", int(todayChapters)),
		zap.Int("weeklyChapters", int(weeklyChapters)),
	)

	return stats, nil
}

// calculateTotalWordsAndChapters 计算总字数和总章节数
func (h *WritingStatsHandler) calculateTotalWordsAndChapters(userID uint) (int, int) {
	var chapters []models.Chapter

	err := h.db.Select("content").
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ?", userID).
		Find(&chapters).Error

	if err != nil {
		logger.Error("查询所有章节失败", zap.Error(err), zap.Uint("userID", userID))
		return 0, 0
	}

	totalWords := 0
	for _, chapter := range chapters {
		totalWords += len([]rune(chapter.Content)) // 使用rune计算中文字符数
	}

	return totalWords, len(chapters)
}

// calculateWordsByDate 计算指定日期的字数
func (h *WritingStatsHandler) calculateWordsByDate(userID uint, date time.Time) int {
	var chapters []models.Chapter
	dateStr := date.Format("2006-01-02")

	err := h.db.Select("content").
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ? AND DATE(chapters.created_at) = ?", userID, dateStr).
		Find(&chapters).Error

	if err != nil {
		logger.Error("查询指定日期章节失败", zap.Error(err), zap.String("date", dateStr))
		return 0
	}

	totalWords := 0
	for _, chapter := range chapters {
		totalWords += len([]rune(chapter.Content)) // 使用rune计算中文字符数
	}

	return totalWords
}

// calculateWordsByDateRange 计算日期范围内的字数
func (h *WritingStatsHandler) calculateWordsByDateRange(userID uint, startDate, endDate time.Time) int {
	var chapters []models.Chapter

	err := h.db.Select("content").
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ? AND chapters.created_at >= ? AND chapters.created_at <= ?",
			userID, startDate, endDate.Add(24*time.Hour-time.Second)).
		Find(&chapters).Error

	if err != nil {
		logger.Error("查询日期范围章节失败", zap.Error(err))
		return 0
	}

	totalWords := 0
	for _, chapter := range chapters {
		totalWords += len([]rune(chapter.Content)) // 使用rune计算中文字符数
	}

	return totalWords
}

// getMonthlyWords 获取本月总字数
func (h *WritingStatsHandler) getMonthlyWords(userID uint, today time.Time) int {
	monthStart := time.Date(today.Year(), today.Month(), 1, 0, 0, 0, 0, today.Location())
	monthEnd := monthStart.AddDate(0, 1, -1) // 本月最后一天

	return h.calculateWordsByDateRange(userID, monthStart, monthEnd)
}

// getOrGenerateGoals 获取或生成写作目标
func (h *WritingStatsHandler) getOrGenerateGoals(userID uint, date time.Time) (*models.WritingGoal, error) {
	// 先尝试获取今日目标
	goal, err := models.GetWritingGoalByDate(h.db, userID, date)
	if err == nil {
		return goal, nil
	}

	// 如果没有今日目标，检查是否需要生成
	if err == gorm.ErrRecordNotFound {
		// 生成新的目标
		return h.generateDailyGoals(userID, date)
	}

	return nil, err
}

// generateDailyGoals 使用AI生成每日目标
func (h *WritingStatsHandler) generateDailyGoals(userID uint, date time.Time) (*models.WritingGoal, error) {
	// 获取过去一周的数据
	weekAgo := date.AddDate(0, 0, -7)
	var weeklyProgress []models.WritingProgress
	if err := h.db.Where("user_id = ? AND date >= ? AND date < ?", userID, weekAgo, date).
		Order("date ASC").Find(&weeklyProgress).Error; err != nil {
		logger.Error("获取历史数据失败", zap.Error(err))
	}

	// 默认目标
	defaultGoal := &models.WritingGoal{
		UserID:        userID,
		Date:          date,
		DailyGoal:     2000,
		WeeklyGoal:    15000,
		MonthlyGoal:   80000,
		IsAIGenerated: false,
	}

	// 如果没有历史数据，也尝试使用AI生成基础目标
	if len(weeklyProgress) == 0 {
		logger.Info("没有历史数据，尝试使用AI生成基础目标", zap.Uint("userID", userID))
		// 尝试使用AI生成基础目标
		aiGoal, err := h.generateBasicGoalsWithAI(userID)
		if err != nil {
			logger.Error("AI生成基础目标失败", zap.Error(err))
			// AI失败时使用默认目标
			if err := models.CreateOrUpdateWritingGoal(h.db, defaultGoal); err != nil {
				return nil, err
			}
			return defaultGoal, nil
		}

		// 设置基本信息
		aiGoal.UserID = userID
		aiGoal.Date = date
		aiGoal.IsAIGenerated = true

		// 保存AI生成的目标
		if err := models.CreateOrUpdateWritingGoal(h.db, aiGoal); err != nil {
			return nil, err
		}
		return aiGoal, nil
	}

	// 尝试使用AI生成目标
	logger.Info("尝试使用AI生成写作目标", zap.Int("历史数据天数", len(weeklyProgress)))
	aiGoal, err := h.generateGoalsWithAI(weeklyProgress)
	if err != nil {
		logger.Error("AI生成目标失败", zap.Error(err))
		// AI失败时使用默认目标
		if err := models.CreateOrUpdateWritingGoal(h.db, defaultGoal); err != nil {
			return nil, err
		}
		return defaultGoal, nil
	}

	// 设置基本信息
	aiGoal.UserID = userID
	aiGoal.Date = date
	aiGoal.IsAIGenerated = true

	// 保存AI生成的目标
	if err := models.CreateOrUpdateWritingGoal(h.db, aiGoal); err != nil {
		return nil, err
	}

	return aiGoal, nil
}

// generateBasicGoalsWithAI 为新用户使用AI生成基础写作目标
func (h *WritingStatsHandler) generateBasicGoalsWithAI(userID uint) (*models.WritingGoal, error) {
	// 构建AI提示
	prompt := `作为一个写作助手，请为一个刚开始使用写作平台的新用户制定合理的写作目标。

用户情况：
- 新用户，暂无历史写作数据
- 需要制定适合初学者的目标
- 目标应该有一定挑战性但不会让用户感到压力过大

请制定适合的目标：
1. 每日目标字数（建议范围：1000-3000字，适合新手）
2. 每周目标字数（建议范围：7000-20000字）  
3. 每月目标字数（建议范围：30000-80000字）

目标应该：
- 适合新手，不会造成过大压力
- 有一定挑战性，能激励用户坚持写作
- 考虑到新用户可能需要时间适应写作节奏

请只返回三个数字，用逗号分隔，格式：每日目标,每周目标,每月目标
例如：1500,10000,50000`

	// 获取LLM配置
	apiKey, baseURL, model := config.GetLLMConfig()
	if apiKey == "" && !config.IsOllamaProvider() {
		return nil, fmt.Errorf("LLM未配置")
	}

	// 创建LLM客户端
	handler := llm.NewHandler(apiKey, baseURL, model)

	// 调用AI
	logger.Info("调用AI生成新用户基础目标", zap.String("model", model))
	response, err := handler.GenerateText(prompt, 0.3, 100)
	if err != nil {
		return nil, fmt.Errorf("AI调用失败: %v", err)
	}

	logger.Info("AI响应", zap.String("response", response))

	// 解析AI响应
	goals, err := h.parseAIGoalsResponse(response)
	if err != nil {
		return nil, fmt.Errorf("解析AI响应失败: %v", err)
	}

	return goals, nil
}

// generateGoalsWithAI 使用AI生成写作目标
func (h *WritingStatsHandler) generateGoalsWithAI(weeklyProgress []models.WritingProgress) (*models.WritingGoal, error) {
	// 构建历史数据描述
	historyDesc := "过去一周的写作数据：\n"
	totalWords := 0
	totalChapters := 0

	for _, progress := range weeklyProgress {
		historyDesc += fmt.Sprintf("- %s: %d字, %d章节\n",
			progress.Date.Format("2006-01-02"), progress.WordCount, progress.ChapterCount)
		totalWords += progress.WordCount
		totalChapters += progress.ChapterCount
	}

	avgDaily := 0
	if len(weeklyProgress) > 0 {
		avgDaily = totalWords / len(weeklyProgress)
	}

	historyDesc += fmt.Sprintf("\n总计：%d字, %d章节\n平均每日：%d字", totalWords, totalChapters, avgDaily)

	// 构建AI提示
	prompt := fmt.Sprintf(`作为一个写作助手，请根据用户过去一周的写作数据，为用户制定合理的写作目标。

%s

请分析用户的写作习惯和能力，制定适合的目标：
1. 每日目标字数（建议范围：1000-5000字）
2. 每周目标字数（建议范围：7000-35000字）  
3. 每月目标字数（建议范围：30000-150000字）

目标应该：
- 基于历史表现，略有挑战性但可实现
- 考虑写作的连续性和可持续性
- 如果历史数据显示用户能力较强，可以适当提高目标
- 如果历史数据较少或不稳定，设置相对保守的目标

请只返回三个数字，用逗号分隔，格式：每日目标,每周目标,每月目标
例如：2000,15000,80000`, historyDesc)

	// 获取LLM配置
	apiKey, baseURL, model := config.GetLLMConfig()
	if apiKey == "" && !config.IsOllamaProvider() {
		return nil, fmt.Errorf("LLM未配置")
	}

	// 创建LLM客户端
	handler := llm.NewHandler(apiKey, baseURL, model)

	// 调用AI
	logger.Info("调用AI生成写作目标",
		zap.String("model", model),
		zap.Int("totalWords", totalWords),
		zap.Int("avgDaily", avgDaily))

	response, err := handler.GenerateText(prompt, 0.3, 100)
	if err != nil {
		return nil, fmt.Errorf("AI调用失败: %v", err)
	}

	logger.Info("AI响应", zap.String("response", response))

	// 解析AI响应
	goals, err := h.parseAIGoalsResponse(response)
	if err != nil {
		return nil, fmt.Errorf("解析AI响应失败: %v", err)
	}

	return goals, nil
}

// parseAIGoalsResponse 解析AI生成的目标响应
func (h *WritingStatsHandler) parseAIGoalsResponse(response string) (*models.WritingGoal, error) {
	logger.Info("开始解析AI响应", zap.String("response", response))

	// 使用正则表达式提取数字
	re := regexp.MustCompile(`\d+`)
	numbers := re.FindAllString(response, -1)

	logger.Info("提取到的数字", zap.Strings("numbers", numbers))

	if len(numbers) < 3 {
		return nil, fmt.Errorf("AI响应中数字不足，需要3个数字，实际找到%d个: %v", len(numbers), numbers)
	}

	// 转换为整数
	daily, err1 := strconv.Atoi(numbers[0])
	weekly, err2 := strconv.Atoi(numbers[1])
	monthly, err3 := strconv.Atoi(numbers[2])

	if err1 != nil || err2 != nil || err3 != nil {
		return nil, fmt.Errorf("数字转换失败: %v, %v, %v", err1, err2, err3)
	}

	// 验证目标的合理性
	if daily < 500 || daily > 10000 {
		logger.Warn("每日目标超出合理范围，使用默认值", zap.Int("original", daily))
		daily = 2000
	}
	if weekly < 3000 || weekly > 70000 {
		logger.Warn("每周目标超出合理范围，使用默认值", zap.Int("original", weekly))
		weekly = 15000
	}
	if monthly < 15000 || monthly > 300000 {
		logger.Warn("每月目标超出合理范围，使用默认值", zap.Int("original", monthly))
		monthly = 80000
	}

	logger.Info("AI目标解析成功",
		zap.Int("daily", daily),
		zap.Int("weekly", weekly),
		zap.Int("monthly", monthly))

	return &models.WritingGoal{
		DailyGoal:   daily,
		WeeklyGoal:  weekly,
		MonthlyGoal: monthly,
	}, nil
}

// UpdateWritingProgress 更新写作进度（自动计算）
func (h *WritingStatsHandler) UpdateWritingProgress(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		response.AbortWithStatus(c, http.StatusUnauthorized)
		return
	}

	var req struct {
		Date string `json:"date"` // 日期，格式：2006-01-02，可选，默认为今天
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		// 如果没有提供日期，使用今天
		req.Date = time.Now().Format("2006-01-02")
	}

	// 解析日期
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		response.Fail(c, "日期格式错误", nil)
		return
	}

	// 自动计算该日期的字数和章节数
	wordCount := h.calculateWordsByDate(user.ID, date)

	var chapterCount int64
	h.db.Model(&models.Chapter{}).
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ? AND DATE(chapters.created_at) = ?", user.ID, date.Format("2006-01-02")).
		Count(&chapterCount)

	// 更新或创建进度记录
	if err := models.UpdateWritingProgress(h.db, user.ID, date, wordCount, int(chapterCount)); err != nil {
		logger.Error("更新写作进度失败", zap.Error(err))
		response.Fail(c, "更新进度失败", nil)
		return
	}

	response.Success(c, "更新成功", gin.H{
		"date":         req.Date,
		"wordCount":    wordCount,
		"chapterCount": int(chapterCount),
		"message":      "进度已自动计算并更新",
	})
}

// CreateActivity 创建活动记录
func (h *WritingStatsHandler) CreateActivity(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		response.AbortWithStatus(c, http.StatusUnauthorized)
		return
	}

	var req struct {
		Type        string `json:"type" binding:"required"`  // 活动类型
		Title       string `json:"title" binding:"required"` // 活动标题
		Description string `json:"description"`              // 活动描述
		NovelID     *uint  `json:"novelId,omitempty"`        // 关联的小说ID
		ChapterID   *uint  `json:"chapterId,omitempty"`      // 关联的章节ID
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误", nil)
		return
	}

	activity := &models.Activity{
		UserID:      user.ID,
		Type:        req.Type,
		Title:       req.Title,
		Description: req.Description,
		NovelID:     req.NovelID,
		ChapterID:   req.ChapterID,
	}

	if err := models.CreateActivity(h.db, activity); err != nil {
		logger.Error("创建活动记录失败", zap.Error(err))
		response.Fail(c, "创建活动记录失败", nil)
		return
	}

	response.Success(c, "创建成功", activity)
}

// SetWritingGoals 设置写作目标
func (h *WritingStatsHandler) SetWritingGoals(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		response.AbortWithStatus(c, http.StatusUnauthorized)
		return
	}

	var req struct {
		Date        string `json:"date" binding:"required"`
		DailyGoal   int    `json:"dailyGoal" binding:"required,min=1"`
		WeeklyGoal  int    `json:"weeklyGoal" binding:"required,min=1"`
		MonthlyGoal int    `json:"monthlyGoal" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Fail(c, "参数错误: "+err.Error(), nil)
		return
	}

	// 解析日期
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		response.Fail(c, "日期格式错误", nil)
		return
	}

	// 创建或更新目标
	goal := &models.WritingGoal{
		UserID:        user.ID,
		Date:          date,
		DailyGoal:     req.DailyGoal,
		WeeklyGoal:    req.WeeklyGoal,
		MonthlyGoal:   req.MonthlyGoal,
		IsAIGenerated: false,
	}

	if err := models.CreateOrUpdateWritingGoal(h.db, goal); err != nil {
		logger.Error("设置写作目标失败", zap.Error(err))
		response.Fail(c, "设置失败", nil)
		return
	}

	response.Success(c, "设置成功", goal)
}

// DebugWordCount 调试字数统计（仅用于开发调试）
func (h *WritingStatsHandler) DebugWordCount(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		response.AbortWithStatus(c, http.StatusUnauthorized)
		return
	}

	dateStr := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	_, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		response.Fail(c, "日期格式错误", nil)
		return
	}

	// 获取该日期的所有章节
	var chapters []models.Chapter
	err = h.db.Select("id, title, content, created_at").
		Joins("JOIN novels ON chapters.novel_id = novels.id").
		Where("novels.author_id = ? AND DATE(chapters.created_at) = ?", user.ID, dateStr).
		Find(&chapters).Error

	if err != nil {
		response.Fail(c, "查询章节失败", nil)
		return
	}

	// 计算每个章节的字数
	var chapterDetails []map[string]interface{}
	totalWords := 0

	for _, chapter := range chapters {
		wordCount := len([]rune(chapter.Content))
		totalWords += wordCount

		chapterDetails = append(chapterDetails, map[string]interface{}{
			"id":        chapter.ID,
			"title":     chapter.Title,
			"wordCount": wordCount,
			"createdAt": chapter.CreatedAt,
		})
	}

	response.Success(c, "调试信息", gin.H{
		"date":           dateStr,
		"totalWords":     totalWords,
		"chapterCount":   len(chapters),
		"chapterDetails": chapterDetails,
	})
}

// RegisterWritingStatsRoutes 注册写作统计路由
func RegisterWritingStatsRoutes(r *gin.RouterGroup, db *gorm.DB) {
	handler := NewWritingStatsHandler(db)

	stats := r.Group("/writing-stats")
	stats.Use(middleware.RequireAuth())
	{
		stats.GET("", handler.GetWritingStats)
		stats.POST("/progress", handler.UpdateWritingProgress)
		stats.POST("/activity", handler.CreateActivity)
		stats.POST("/goals", handler.SetWritingGoals)
		stats.GET("/debug/wordcount", handler.DebugWordCount) // 调试接口
	}
}
