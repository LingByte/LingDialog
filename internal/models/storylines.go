package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// Storyline 故事线模型
type Storyline struct {
	ID          int       `json:"id" gorm:"primaryKey;autoIncrement"`
	NovelID     int       `json:"novelId" gorm:"column:novel_id;not null;index"`
	Title       string    `json:"title" gorm:"size:255;not null"`
	Description string    `json:"description" gorm:"type:text"`
	Type        string    `json:"type" gorm:"size:50;default:main"`     // main, character, plot, theme
	Status      string    `json:"status" gorm:"size:50;default:active"` // active, completed, paused
	Priority    int       `json:"priority" gorm:"default:0"`
	Color       string    `json:"color" gorm:"size:7;default:#3B82F6"`
	CreatedAt   time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"autoUpdateTime"`

	// 关联数据
	Nodes []StoryNode `json:"nodes,omitempty" gorm:"foreignKey:StorylineID"`
}

// StoryNode 故事节点模型
type StoryNode struct {
	ID           int       `json:"id" gorm:"primaryKey;autoIncrement"`
	StorylineID  int       `json:"storylineId" gorm:"column:storyline_id;not null;index"`
	Title        string    `json:"title" gorm:"size:255;not null"`
	Description  string    `json:"description" gorm:"type:text"`
	NodeType     string    `json:"nodeType" gorm:"column:node_type;size:50;default:event"` // start, event, turning, merge, end
	PositionX    float64   `json:"positionX" gorm:"column:position_x;default:0"`
	PositionY    float64   `json:"positionY" gorm:"column:position_y;default:0"`
	ChapterRange string    `json:"chapterRange" gorm:"column:chapter_range;size:100"`
	CharacterIDs string    `json:"characterIds" gorm:"column:character_ids;type:text"`  // JSON 数组字符串
	PlotPointIDs string    `json:"plotPointIds" gorm:"column:plot_point_ids;type:text"` // JSON 数组字符串
	Status       string    `json:"status" gorm:"size:50;default:planned"`               // planned, writing, completed
	OrderIndex   int       `json:"orderIndex" gorm:"column:order_index;default:0"`
	CreatedAt    time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"autoUpdateTime"`

	// 关联数据
	Storyline *Storyline `json:"storyline,omitempty" gorm:"foreignKey:StorylineID"`

	// 虚拟字段（用于前端）
	Position   Position `json:"position" gorm:"-"`
	Characters []int    `json:"characters" gorm:"-"`
	PlotPoints []int    `json:"plotPoints" gorm:"-"`
}

// Position 节点位置
type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// NodeConnection 节点连接模型
type NodeConnection struct {
	ID             int       `json:"id" gorm:"primaryKey;autoIncrement"`
	FromNodeID     int       `json:"fromNodeId" gorm:"column:from_node_id;not null;index"`
	ToNodeID       int       `json:"toNodeId" gorm:"column:to_node_id;not null;index"`
	ConnectionType string    `json:"connectionType" gorm:"column:connection_type;size:50;default:sequence"` // sequence, cause, parallel, condition
	Description    string    `json:"description" gorm:"type:text"`
	Weight         int       `json:"weight" gorm:"default:1"` // 连接强度 1-10
	CreatedAt      time.Time `json:"createdAt" gorm:"autoCreateTime"`
	UpdatedAt      time.Time `json:"updatedAt" gorm:"autoUpdateTime"`

	// 关联数据
	FromNode *StoryNode `json:"fromNode,omitempty" gorm:"foreignKey:FromNodeID"`
	ToNode   *StoryNode `json:"toNode,omitempty" gorm:"foreignKey:ToNodeID"`
}

// TableName 指定表名
func (Storyline) TableName() string {
	return "storylines"
}

func (StoryNode) TableName() string {
	return "story_nodes"
}

func (NodeConnection) TableName() string {
	return "node_connections"
}

// BeforeSave 保存前处理
func (s *StoryNode) BeforeSave(tx *gorm.DB) error {
	// 将 Position 转换为 PositionX, PositionY
	s.PositionX = s.Position.X
	s.PositionY = s.Position.Y

	// 将 Characters 数组转换为 JSON 字符串
	if len(s.Characters) > 0 {
		if data, err := json.Marshal(s.Characters); err == nil {
			s.CharacterIDs = string(data)
		}
	}

	// 将 PlotPoints 数组转换为 JSON 字符串
	if len(s.PlotPoints) > 0 {
		if data, err := json.Marshal(s.PlotPoints); err == nil {
			s.PlotPointIDs = string(data)
		}
	}

	return nil
}

// AfterFind 查询后处理
func (s *StoryNode) AfterFind(tx *gorm.DB) error {
	// 设置 Position
	s.Position = Position{
		X: s.PositionX,
		Y: s.PositionY,
	}

	// 解析 Characters JSON 字符串
	if s.CharacterIDs != "" {
		var characters []int
		if err := json.Unmarshal([]byte(s.CharacterIDs), &characters); err == nil {
			s.Characters = characters
		}
	}

	// 解析 PlotPoints JSON 字符串
	if s.PlotPointIDs != "" {
		var plotPoints []int
		if err := json.Unmarshal([]byte(s.PlotPointIDs), &plotPoints); err == nil {
			s.PlotPoints = plotPoints
		}
	}

	return nil
}

// StorylineWithStats 带统计信息的故事线
type StorylineWithStats struct {
	Storyline
	NodeCount      int `json:"nodeCount"`
	CompletedNodes int `json:"completedNodes"`
	Progress       int `json:"progress"` // 完成百分比
}

// StorylineGenerateRequest AI 生成故事线请求
type StorylineGenerateRequest struct {
	NovelID        int      `json:"novelId" binding:"required"`
	NovelTitle     string   `json:"novelTitle"`
	NovelGenre     string   `json:"novelGenre"`
	WorldSetting   string   `json:"worldSetting"`
	Characters     []string `json:"characters"`     // 主要角色描述
	MainConflict   string   `json:"mainConflict"`   // 核心冲突
	StorylineCount int      `json:"storylineCount"` // 生成故事线数量，默认3条
	NodesPerLine   int      `json:"nodesPerLine"`   // 每条故事线的节点数，默认6个
}

// StorylineGenerateResponse AI 生成故事线响应
type StorylineGenerateResponse struct {
	Storylines []GeneratedStoryline `json:"storylines"`
}

// GeneratedStoryline 生成的故事线
type GeneratedStoryline struct {
	Title       string                `json:"title"`
	Description string                `json:"description"`
	Type        string                `json:"type"`
	Color       string                `json:"color"`
	Nodes       []GeneratedNode       `json:"nodes"`
	Connections []GeneratedConnection `json:"connections"`
}

// GeneratedNode 生成的故事节点
type GeneratedNode struct {
	Title        string `json:"title"`
	Description  string `json:"description"`
	NodeType     string `json:"nodeType"`
	ChapterRange string `json:"chapterRange"`
	Characters   []int  `json:"characters"`
	PlotPoints   []int  `json:"plotPoints"`
	OrderIndex   int    `json:"orderIndex"`
}

// GeneratedConnection 生成的节点连接
type GeneratedConnection struct {
	FromIndex      int    `json:"fromIndex"` // 在节点数组中的索引
	ToIndex        int    `json:"toIndex"`
	ConnectionType string `json:"connectionType"`
	Description    string `json:"description"`
	Weight         int    `json:"weight"`
}
