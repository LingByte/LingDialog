package models

import "github.com/LingByte/LingDialog/pkg/constants"

type PlotPoint struct {
	BaseModel
	NovelID uint   `json:"novelId" gorm:"index;comment:小说ID"`
	Title   string `json:"title" gorm:"size:255;not null;comment:情节标题"`
	Content string `json:"content" gorm:"type:text;comment:情节内容"`
}

func (PlotPoint) TableName() string {
	return constants.TABLE_PLOT_POINT
}
