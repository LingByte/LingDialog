package models

import (
	"fmt"
	"gorm.io/gorm"
	"time"
)

// WritingGoal 写作目标
type WritingGoal struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	UserID        uint      `json:"userId" gorm:"not null;index:idx_writing_goals_user_date,unique"`
	Date          time.Time `json:"date" gorm:"not null;index:idx_writing_goals_user_date,unique;type:date"`
	DailyGoal     int       `json:"dailyGoal" gorm:"not null;default:2000"`    // 每日目标字数
	WeeklyGoal    int       `json:"weeklyGoal" gorm:"not null;default:15000"`  // 每周目标字数
	MonthlyGoal   int       `json:"monthlyGoal" gorm:"not null;default:80000"` // 每月目标字数
	IsAIGenerated bool      `json:"isAiGenerated" gorm:"default:false"`        // 是否由AI生成
	CreatedAt     time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt     time.Time `json:"updatedAt" gorm:"autoUpdateTime"`

	// 关联
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName 指定表名
func (WritingGoal) TableName() string {
	return "writing_goals"
}

// BeforeCreate GORM钩子：创建前检查唯一性
func (wg *WritingGoal) BeforeCreate(tx *gorm.DB) error {
	// 检查是否已存在同一用户同一天的目标
	var count int64
	dateStr := wg.Date.Format("2006-01-02")
	err := tx.Model(&WritingGoal{}).Where("user_id = ? AND date = ?", wg.UserID, dateStr).Count(&count).Error
	if err != nil {
		return err
	}
	if count > 0 {
		return gorm.ErrDuplicatedKey
	}
	return nil
}

// WritingProgress 写作进度统计
type WritingProgress struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	UserID       uint      `json:"userId" gorm:"not null;index:idx_writing_progress_user_date,unique"`
	Date         time.Time `json:"date" gorm:"not null;index:idx_writing_progress_user_date,unique;type:date"`
	WordCount    int       `json:"wordCount" gorm:"not null;default:0"`    // 当日写作字数
	ChapterCount int       `json:"chapterCount" gorm:"not null;default:0"` // 当日章节数
	CreatedAt    time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"autoUpdateTime"`

	// 关联
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName 指定表名
func (WritingProgress) TableName() string {
	return "writing_progress"
}

// Activity 活动记录
type Activity struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	UserID      uint      `json:"userId" gorm:"not null;index"`
	Type        string    `json:"type" gorm:"not null"`  // 活动类型：chapter_created, novel_created, character_updated 等
	Title       string    `json:"title" gorm:"not null"` // 活动标题
	Description string    `json:"description"`           // 活动描述
	NovelID     *uint     `json:"novelId,omitempty"`     // 关联的小说ID
	ChapterID   *uint     `json:"chapterId,omitempty"`   // 关联的章节ID
	CreatedAt   time.Time `json:"createdAt" gorm:"autoCreateTime"`

	// 关联
	User    *User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Novel   *Novel   `json:"novel,omitempty" gorm:"foreignKey:NovelID"`
	Chapter *Chapter `json:"chapter,omitempty" gorm:"foreignKey:ChapterID"`
}

// WritingStats 写作统计响应
type WritingStats struct {
	// 基础统计
	TotalNovels     int `json:"totalNovels"`     // 总小说数
	TotalWords      int `json:"totalWords"`      // 总字数（所有章节）
	TotalChapters   int `json:"totalChapters"`   // 总章节数
	MonthlyChapters int `json:"monthlyChapters"` // 本月章节数
	WeeklyWords     int `json:"weeklyWords"`     // 本周字数
	TodayWords      int `json:"todayWords"`      // 今日字数

	// 目标设置
	Goals WritingGoal `json:"goals"` // 当前目标

	// 进度统计
	TodayProgress   ProgressInfo `json:"todayProgress"`   // 今日进度
	WeeklyProgress  ProgressInfo `json:"weeklyProgress"`  // 本周进度
	MonthlyProgress ProgressInfo `json:"monthlyProgress"` // 本月进度

	// 完成度
	TodayChapters  int     `json:"todayChapters"`  // 今日章节数
	WeeklyChapters int     `json:"weeklyChapters"` // 本周章节数
	CompletionRate float64 `json:"completionRate"` // 完成度百分比

	// 最近活动
	RecentActivities []Activity `json:"recentActivities"` // 最近活动
}

// ProgressInfo 进度信息
type ProgressInfo struct {
	Current int `json:"current"` // 当前值
	Target  int `json:"target"`  // 目标值
}

// GetWritingGoalByDate 获取指定日期的写作目标
func GetWritingGoalByDate(db *gorm.DB, userID uint, date time.Time) (*WritingGoal, error) {
	var goal WritingGoal
	dateStr := date.Format("2006-01-02")

	err := db.Where("user_id = ? AND date = ?", userID, dateStr).First(&goal).Error
	if err != nil {
		return nil, err
	}
	return &goal, nil
}

// CreateOrUpdateWritingGoal 创建或更新写作目标
func CreateOrUpdateWritingGoal(db *gorm.DB, goal *WritingGoal) error {
	dateStr := goal.Date.Format("2006-01-02")

	var existing WritingGoal
	err := db.Where("user_id = ? AND date = ?", goal.UserID, dateStr).First(&existing).Error

	if err == gorm.ErrRecordNotFound {
		// 创建新记录，GORM会自动设置时间字段
		return db.Create(goal).Error
	} else if err != nil {
		return err
	} else {
		// 更新现有记录，只更新需要的字段
		updates := map[string]interface{}{
			"daily_goal":      goal.DailyGoal,
			"weekly_goal":     goal.WeeklyGoal,
			"monthly_goal":    goal.MonthlyGoal,
			"is_ai_generated": goal.IsAIGenerated,
		}
		return db.Model(&existing).Updates(updates).Error
	}
}

// CleanupDuplicateWritingGoals 清理重复的写作目标数据
func CleanupDuplicateWritingGoals(db *gorm.DB) error {
	// 查找重复的记录（同一用户同一天有多条记录）
	var duplicates []struct {
		UserID uint
		Date   string
		Count  int
	}

	err := db.Model(&WritingGoal{}).
		Select("user_id, DATE(date) as date, COUNT(*) as count").
		Group("user_id, DATE(date)").
		Having("COUNT(*) > 1").
		Find(&duplicates).Error

	if err != nil {
		return err
	}

	// 对每组重复数据，保留最新的一条，删除其他的
	for _, dup := range duplicates {
		var goals []WritingGoal
		err := db.Where("user_id = ? AND DATE(date) = ?", dup.UserID, dup.Date).
			Order("updated_at DESC").
			Find(&goals).Error

		if err != nil {
			continue
		}

		// 保留第一条（最新的），删除其他的
		if len(goals) > 1 {
			var idsToDelete []uint
			for i := 1; i < len(goals); i++ {
				idsToDelete = append(idsToDelete, goals[i].ID)
			}

			if len(idsToDelete) > 0 {
				db.Delete(&WritingGoal{}, idsToDelete)
			}
		}
	}

	return nil
}

// GetWritingProgressByDate 获取指定日期的写作进度
func GetWritingProgressByDate(db *gorm.DB, userID uint, date time.Time) (*WritingProgress, error) {
	var progress WritingProgress
	dateStr := date.Format("2006-01-02")

	err := db.Where("user_id = ? AND date = ?", userID, dateStr).First(&progress).Error
	if err != nil {
		return nil, err
	}
	return &progress, nil
}

// UpdateWritingProgress 更新写作进度
func UpdateWritingProgress(db *gorm.DB, userID uint, date time.Time, wordCount, chapterCount int) error {
	dateStr := date.Format("2006-01-02")

	var progress WritingProgress
	err := db.Where("user_id = ? AND date = ?", userID, dateStr).First(&progress).Error

	if err == gorm.ErrRecordNotFound {
		// 创建新记录，GORM会自动设置时间字段
		progress = WritingProgress{
			UserID:       userID,
			Date:         date,
			WordCount:    wordCount,
			ChapterCount: chapterCount,
		}
		return db.Create(&progress).Error
	} else if err != nil {
		return err
	} else {
		// 更新现有记录（使用绝对值，不是累加）
		updates := map[string]interface{}{
			"word_count":    wordCount,
			"chapter_count": chapterCount,
		}
		return db.Model(&progress).Updates(updates).Error
	}
}

// CreateActivity 创建活动记录
func CreateActivity(db *gorm.DB, activity *Activity) error {
	// GORM会自动设置时间字段
	return db.Create(activity).Error
}

// GetRecentActivities 获取最近的活动记录
func GetRecentActivities(db *gorm.DB, userID uint, limit int) ([]Activity, error) {
	var activities []Activity
	err := db.Where("user_id = ?", userID).
		Preload("Novel").
		Preload("Chapter").
		Order("created_at DESC").
		Limit(limit).
		Find(&activities).Error

	return activities, err
}

// MigrateWritingStatsSchema 迁移写作统计相关的数据库结构
func MigrateWritingStatsSchema(db *gorm.DB) error {
	// 1. 清理重复数据
	if err := CleanupDuplicateWritingGoals(db); err != nil {
		return fmt.Errorf("清理重复写作目标数据失败: %v", err)
	}

	// 2. 添加唯一索引
	// 为 writing_goals 表添加唯一索引
	if !db.Migrator().HasIndex(&WritingGoal{}, "idx_writing_goals_user_date") {
		if err := db.Migrator().CreateIndex(&WritingGoal{}, "idx_writing_goals_user_date"); err != nil {
			return fmt.Errorf("创建写作目标唯一索引失败: %v", err)
		}
	}

	// 为 writing_progress 表添加唯一索引
	if !db.Migrator().HasIndex(&WritingProgress{}, "idx_writing_progress_user_date") {
		if err := db.Migrator().CreateIndex(&WritingProgress{}, "idx_writing_progress_user_date"); err != nil {
			return fmt.Errorf("创建写作进度唯一索引失败: %v", err)
		}
	}

	return nil
}
