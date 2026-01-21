package models

import "time"

// NovelSetting 小说设定模型
type NovelSetting struct {
	ID          int       `json:"id" gorm:"primaryKey;autoIncrement"`
	NovelID     int       `json:"novelId" gorm:"column:novel_id;not null;index"`
	Category    string    `json:"category" gorm:"size:100;not null;index"` // 设定分类：world, power, tech, concept, rule, etc.
	Title       string    `json:"title" gorm:"size:255;not null"`
	Content     string    `json:"content" gorm:"type:text"`
	Tags        string    `json:"tags" gorm:"size:500"`        // 标签，逗号分隔
	OrderIndex  int       `json:"orderIndex" gorm:"default:0"` // 排序索引
	IsImportant bool      `json:"isImportant" gorm:"default:false"`
	CreatedAt   time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"autoUpdateTime"`
}

// TableName 指定表名
func (NovelSetting) TableName() string {
	return "novel_settings"
}

// SettingCategory 设定分类常量
const (
	SettingCategoryWorld   = "world"   // 世界观背景
	SettingCategoryPower   = "power"   // 力量体系（修炼/魔法/异能等）
	SettingCategoryTech    = "tech"    // 科技设定
	SettingCategoryConcept = "concept" // 基础概念
	SettingCategoryRule    = "rule"    // 规则设定
	SettingCategoryOrg     = "org"     // 组织势力
	SettingCategoryItem    = "item"    // 物品道具
	SettingCategoryOther   = "other"   // 其他
)

// GetCategoryName 获取分类名称
func GetCategoryName(category string) string {
	names := map[string]string{
		SettingCategoryWorld:   "世界观背景",
		SettingCategoryPower:   "力量体系",
		SettingCategoryTech:    "科技设定",
		SettingCategoryConcept: "基础概念",
		SettingCategoryRule:    "规则设定",
		SettingCategoryOrg:     "组织势力",
		SettingCategoryItem:    "物品道具",
		SettingCategoryOther:   "其他",
	}
	if name, ok := names[category]; ok {
		return name
	}
	return "未知分类"
}

// SettingGenerateRequest AI 生成设定请求
type SettingGenerateRequest struct {
	NovelID      int    `json:"novelId" binding:"required"`
	NovelTitle   string `json:"novelTitle"`
	NovelGenre   string `json:"novelGenre"`
	Category     string `json:"category" binding:"required"` // 要生成的设定分类
	Title        string `json:"title"`                       // 设定标题（可选，AI 可以生成）
	Context      string `json:"context"`                     // 上下文信息
	Requirements string `json:"requirements"`                // 具体要求
}

// SettingGenerateResponse AI 生成设定响应
type SettingGenerateResponse struct {
	Title   string `json:"title"`
	Content string `json:"content"`
	Tags    string `json:"tags"`
}
