package models

// Character 角色模型
type Character struct {
	BaseModel
	NovelID     uint   `json:"novelId" gorm:"index;comment:小说ID"`
	Name        string `json:"name" gorm:"size:255;not null;comment:角色名称"`
	Description string `json:"description" gorm:"type:text;comment:角色描述"`
}

func (Character) TableName() string {
	return "characters"
}
