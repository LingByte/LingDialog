package models

import (
	"github.com/LingByte/LingDialog/pkg/constants"
	"gorm.io/gorm"
)

// ChatSession 聊天会话模型
type ChatSession struct {
	BaseModel
	UserID      uint   `json:"userId" gorm:"not null;comment:用户ID"`
	NovelID     *uint  `json:"novelId" gorm:"comment:关联小说ID(可选)"`
	Title       string `json:"title" gorm:"size:255;comment:会话标题"`
	Description string `json:"description" gorm:"size:500;comment:会话描述"`
	Status      string `json:"status" gorm:"size:20;default:active;comment:会话状态(active/archived/deleted)"`

	// 统计信息
	MessageCount int `json:"messageCount" gorm:"default:0;comment:消息总数"`
	TotalTokens  int `json:"totalTokens" gorm:"default:0;comment:总token消耗"`

	// 关联
	User     User          `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Novel    *Novel        `json:"novel,omitempty" gorm:"foreignKey:NovelID"`
	Messages []ChatMessage `json:"messages,omitempty" gorm:"foreignKey:SessionID"`
}

func (ChatSession) TableName() string {
	return constants.TABLE_CHAT_SESSION
}

// ChatMessage 聊天消息模型
type ChatMessage struct {
	BaseModel
	SessionID uint   `json:"sessionId" gorm:"not null;comment:会话ID"`
	Role      string `json:"role" gorm:"size:20;not null;comment:角色(user/assistant/system)"`
	Content   string `json:"content" gorm:"type:text;not null;comment:消息内容"`

	// Token 统计
	PromptTokens     int `json:"promptTokens" gorm:"default:0;comment:输入token数"`
	CompletionTokens int `json:"completionTokens" gorm:"default:0;comment:输出token数"`
	TotalTokens      int `json:"totalTokens" gorm:"default:0;comment:总token数"`

	// 模型信息
	Model       string  `json:"model" gorm:"size:100;comment:使用的模型"`
	Temperature float32 `json:"temperature" gorm:"comment:温度参数"`
	MaxTokens   int     `json:"maxTokens" gorm:"comment:最大token限制"`

	// 响应时间统计
	ResponseTime int64 `json:"responseTime" gorm:"comment:响应时间(毫秒)"`

	// 关联
	Session ChatSession `json:"session,omitempty" gorm:"foreignKey:SessionID"`
}

func (ChatMessage) TableName() string {
	return constants.TABLE_CHAT_MESSAGE
}

// ChatUsage 用户聊天使用统计
type ChatUsage struct {
	BaseModel
	UserID uint   `json:"userId" gorm:"not null;uniqueIndex:idx_user_date;comment:用户ID"`
	Date   string `json:"date" gorm:"size:10;not null;uniqueIndex:idx_user_date;comment:日期(YYYY-MM-DD)"`

	// 每日统计
	MessageCount     int `json:"messageCount" gorm:"default:0;comment:消息数量"`
	SessionCount     int `json:"sessionCount" gorm:"default:0;comment:会话数量"`
	TotalTokens      int `json:"totalTokens" gorm:"default:0;comment:总token消耗"`
	PromptTokens     int `json:"promptTokens" gorm:"default:0;comment:输入token数"`
	CompletionTokens int `json:"completionTokens" gorm:"default:0;comment:输出token数"`

	// 关联
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

func (ChatUsage) TableName() string {
	return constants.TABLE_CHAT_USAGE
}

// BeforeCreate 创建前钩子
func (cs *ChatSession) BeforeCreate(tx *gorm.DB) error {
	if cs.Title == "" {
		cs.Title = "新对话"
	}
	return nil
}

// AfterCreate 创建后钩子 - 更新用户统计
func (cm *ChatMessage) AfterCreate(tx *gorm.DB) error {
	// 更新会话统计
	tx.Model(&ChatSession{}).Where("id = ?", cm.SessionID).Updates(map[string]interface{}{
		"message_count": gorm.Expr("message_count + 1"),
		"total_tokens":  gorm.Expr("total_tokens + ?", cm.TotalTokens),
	})

	// 更新用户每日统计
	var session ChatSession
	if err := tx.Select("user_id").First(&session, cm.SessionID).Error; err != nil {
		return err
	}

	date := cm.CreatedAt.Format("2006-01-02")
	usage := ChatUsage{
		UserID: session.UserID,
		Date:   date,
	}

	// 使用 ON DUPLICATE KEY UPDATE 或 UPSERT 逻辑
	tx.Where("user_id = ? AND date = ?", session.UserID, date).
		Assign(map[string]interface{}{
			"message_count":     gorm.Expr("message_count + 1"),
			"total_tokens":      gorm.Expr("total_tokens + ?", cm.TotalTokens),
			"prompt_tokens":     gorm.Expr("prompt_tokens + ?", cm.PromptTokens),
			"completion_tokens": gorm.Expr("completion_tokens + ?", cm.CompletionTokens),
		}).
		FirstOrCreate(&usage)

	return nil
}
