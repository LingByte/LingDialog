package models

// Chapter 章节模型
type Chapter struct {
	BaseModel
	NovelID         uint   `json:"novelId" gorm:"index;comment:小说ID"`
	VolumeID        uint   `json:"volumeId" gorm:"index;comment:卷ID"`
	Title           string `json:"title" gorm:"size:255;not null;comment:章节标题"`
	Content         string `json:"content" gorm:"type:text;comment:章节内容"`
	Order           int    `json:"order" gorm:"comment:章节顺序"`
	Summary         string `json:"summary" gorm:"type:text;comment:章节摘要"`
	CharacterIDs    string `json:"characterIds" gorm:"size:500;comment:参与角色ID列表(逗号分隔)"`
	PlotPointIDs    string `json:"plotPointIds" gorm:"size:500;comment:涉及情节ID列表(逗号分隔)"`
	PreviousSummary string `json:"previousSummary" gorm:"type:text;comment:前文摘要"`
	Outline         string `json:"outline" gorm:"type:text;comment:章节大纲"`
	Status          string `json:"status" gorm:"size:50;comment:章节状态(draft/generated/reviewed/published)"`
}

func (Chapter) TableName() string {
	return "chapters"
}
