package models

// Volume 卷模型
type Volume struct {
	BaseModel
	NovelID     uint   `json:"novelId" gorm:"index;comment:小说ID"`
	Title       string `json:"title" gorm:"size:255;not null;comment:卷标题"`
	Description string `json:"description" gorm:"type:text;comment:卷的描述"`
}

func (Volume) TableName() string {
	return "volumes"
}
