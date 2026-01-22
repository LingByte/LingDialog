package models

import (
	"github.com/LingByte/LingDialog/pkg/constants"
	"gorm.io/gorm"
)

// Novel 小说模型
type Novel struct {
	BaseModel
	Title          string `json:"title" gorm:"size:255;not null;comment:小说标题"`
	AuthorID       uint   `json:"authorId" gorm:"comment:作者ID"`
	Status         string `json:"status" gorm:"size:50;comment:小说状态"`
	Genre          string `json:"genre" gorm:"size:100;comment:小说类型(玄幻/都市/科幻/武侠等)"`
	Description    string `json:"description" gorm:"type:text;comment:小说简介"`
	WorldSetting   string `json:"worldSetting" gorm:"type:text;comment:世界观设定"`
	Tags           string `json:"tags" gorm:"size:500;comment:标签(逗号分隔)"`
	CoverImage     string `json:"coverImage" gorm:"size:500;comment:封面图片URL"`
	StyleGuide     string `json:"styleGuide" gorm:"type:text;comment:写作风格指南"`
	ReferenceNovel string `json:"referenceNovel" gorm:"type:text;comment:参考小说内容"`
}

func (Novel) TableName() string {
	return constants.TABLE_NOVEL
}

// AfterCreate 钩子：创建小说后自动创建主故事线
func (n *Novel) AfterCreate(tx *gorm.DB) error {
	// 创建主故事线
	mainStoryline := Storyline{
		NovelID:     int(n.ID),
		Title:       "主线剧情",
		Description: "小说的主要故事线，描述核心情节的发展脉络",
		Type:        "main",
		Status:      "active",
		Priority:    10,
		Color:       "#FF6B6B",
	}
	// 使用同一个事务创建故事线
	if err := tx.Create(&mainStoryline).Error; err != nil {
		return nil
	}
	return nil
}
