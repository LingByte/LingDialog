package handlers

import (
	"net/http"
	"strconv"

	"github.com/code-100-precent/LingFramework/internal/models"
	"github.com/code-100-precent/LingFramework/pkg/config"
	"github.com/code-100-precent/LingFramework/pkg/llm"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// StorylineHandler 故事线处理器
type StorylineHandler struct {
	db                 *gorm.DB
	storylineGenerator *llm.StorylineGenerator
}

// NewStorylineHandler 创建故事线处理器
func NewStorylineHandler(db *gorm.DB) *StorylineHandler {
	// 从配置中获取 LLM 设置
	apiKey := config.GlobalConfig.LLMApiKey
	baseURL := config.GlobalConfig.LLMBaseURL
	model := config.GlobalConfig.LLMModel

	storylineGenerator := llm.NewStorylineGenerator(apiKey, baseURL, model)

	return &StorylineHandler{
		db:                 db,
		storylineGenerator: storylineGenerator,
	}
}

// GetStorylines 获取小说的所有故事线
// @Summary 获取故事线列表
// @Description 获取指定小说的所有故事线
// @Tags Storylines
// @Accept json
// @Produce json
// @Param novelId path int true "小说ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/storylines/{novelId} [get]
func (h *StorylineHandler) GetStorylines(c *gin.Context) {
	novelIdStr := c.Param("novelId")
	novelId, err := strconv.Atoi(novelIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的小说ID",
		})
		return
	}

	var storylines []models.Storyline
	if err := h.db.Where("novel_id = ?", novelId).
		Preload("Nodes").
		Order("priority DESC, created_at ASC").
		Find(&storylines).Error; err != nil {
		logger.Error("Failed to get storylines",
			zap.Int("novelId", novelId),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "获取故事线失败",
		})
		return
	}

	// 计算统计信息
	var storylinesWithStats []models.StorylineWithStats
	for _, storyline := range storylines {
		stats := models.StorylineWithStats{
			Storyline: storyline,
			NodeCount: len(storyline.Nodes),
		}

		// 计算完成的节点数
		for _, node := range storyline.Nodes {
			if node.Status == "completed" {
				stats.CompletedNodes++
			}
		}

		// 计算进度百分比
		if stats.NodeCount > 0 {
			stats.Progress = (stats.CompletedNodes * 100) / stats.NodeCount
		}

		storylinesWithStats = append(storylinesWithStats, stats)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": storylinesWithStats,
	})
}

// CreateStoryline 创建故事线
// @Summary 创建故事线
// @Description 创建新的故事线
// @Tags Storylines
// @Accept json
// @Produce json
// @Param request body models.Storyline true "故事线信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/storylines [post]
func (h *StorylineHandler) CreateStoryline(c *gin.Context) {
	var storyline models.Storyline
	if err := c.ShouldBindJSON(&storyline); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	if err := h.db.Create(&storyline).Error; err != nil {
		logger.Error("Failed to create storyline",
			zap.String("title", storyline.Title),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建故事线失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "创建成功",
		"data": storyline,
	})
}

// UpdateStoryline 更新故事线
// @Summary 更新故事线
// @Description 更新故事线信息
// @Tags Storylines
// @Accept json
// @Produce json
// @Param id path int true "故事线ID"
// @Param request body models.Storyline true "故事线信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/storylines/{id} [put]
func (h *StorylineHandler) UpdateStoryline(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的故事线ID",
		})
		return
	}

	var storyline models.Storyline
	if err := c.ShouldBindJSON(&storyline); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	// 先查询现有记录
	var existing models.Storyline
	if err := h.db.First(&existing, id).Error; err != nil {
		logger.Error("Failed to find storyline",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusNotFound, gin.H{
			"code": 404,
			"msg":  "故事线不存在",
		})
		return
	}

	// 只更新提供的字段
	updates := make(map[string]interface{})
	if storyline.Title != "" {
		updates["title"] = storyline.Title
	}
	if storyline.Description != "" {
		updates["description"] = storyline.Description
	}
	if storyline.Type != "" {
		updates["type"] = storyline.Type
	}
	if storyline.Status != "" {
		updates["status"] = storyline.Status
	}
	if storyline.Priority != 0 {
		updates["priority"] = storyline.Priority
	}
	if storyline.Color != "" {
		updates["color"] = storyline.Color
	}

	if err := h.db.Model(&existing).Updates(updates).Error; err != nil {
		logger.Error("Failed to update storyline",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "更新故事线失败",
		})
		return
	}

	// 重新查询更新后的记录
	if err := h.db.First(&existing, id).Error; err != nil {
		logger.Error("Failed to fetch updated storyline",
			zap.Int("id", id),
			zap.Error(err))
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "更新成功",
		"data": existing,
	})
}

// DeleteStoryline 删除故事线
// @Summary 删除故事线
// @Description 删除指定的故事线
// @Tags Storylines
// @Accept json
// @Produce json
// @Param id path int true "故事线ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/storylines/{id} [delete]
func (h *StorylineHandler) DeleteStoryline(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的故事线ID",
		})
		return
	}

	if err := h.db.Delete(&models.Storyline{}, id).Error; err != nil {
		logger.Error("Failed to delete storyline",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "删除故事线失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "删除成功",
	})
}

// GetStoryNodes 获取故事线的所有节点
// @Summary 获取故事节点列表
// @Description 获取指定故事线的所有节点
// @Tags StoryNodes
// @Accept json
// @Produce json
// @Param storylineId path int true "故事线ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/story-nodes/{storylineId} [get]
func (h *StorylineHandler) GetStoryNodes(c *gin.Context) {
	storylineIdStr := c.Param("storylineId")
	storylineId, err := strconv.Atoi(storylineIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的故事线ID",
		})
		return
	}

	var nodes []models.StoryNode
	if err := h.db.Where("storyline_id = ?", storylineId).
		Order("order_index ASC").
		Find(&nodes).Error; err != nil {
		logger.Error("Failed to get story nodes",
			zap.Int("storylineId", storylineId),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "获取故事节点失败",
		})
		return
	}

	// 处理虚拟字段
	for i := range nodes {
		nodes[i].AfterFind(nil)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": nodes,
	})
}

// CreateStoryNode 创建故事节点
// @Summary 创建故事节点
// @Description 创建新的故事节点
// @Tags StoryNodes
// @Accept json
// @Produce json
// @Param request body models.StoryNode true "故事节点信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/story-nodes [post]
func (h *StorylineHandler) CreateStoryNode(c *gin.Context) {
	var node models.StoryNode
	if err := c.ShouldBindJSON(&node); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	// 处理保存前的数据转换
	if err := node.BeforeSave(nil); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "数据处理错误: " + err.Error(),
		})
		return
	}

	if err := h.db.Create(&node).Error; err != nil {
		logger.Error("Failed to create story node",
			zap.String("title", node.Title),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建故事节点失败",
		})
		return
	}

	// 处理查询后的数据转换
	node.AfterFind(nil)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "创建成功",
		"data": node,
	})
}

// UpdateStoryNode 更新故事节点
// @Summary 更新故事节点
// @Description 更新故事节点信息
// @Tags StoryNodes
// @Accept json
// @Produce json
// @Param id path int true "故事节点ID"
// @Param request body models.StoryNode true "故事节点信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/story-nodes/{id} [put]
func (h *StorylineHandler) UpdateStoryNode(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的故事节点ID",
		})
		return
	}

	var node models.StoryNode
	if err := c.ShouldBindJSON(&node); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	node.ID = id

	// 处理保存前的数据转换
	if err := node.BeforeSave(nil); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "数据处理错误: " + err.Error(),
		})
		return
	}

	if err := h.db.Save(&node).Error; err != nil {
		logger.Error("Failed to update story node",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "更新故事节点失败",
		})
		return
	}

	// 处理查询后的数据转换
	node.AfterFind(nil)

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "更新成功",
		"data": node,
	})
}

// DeleteStoryNode 删除故事节点
// @Summary 删除故事节点
// @Description 删除指定的故事节点
// @Tags StoryNodes
// @Accept json
// @Produce json
// @Param id path int true "故事节点ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/story-nodes/{id} [delete]
func (h *StorylineHandler) DeleteStoryNode(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的故事节点ID",
		})
		return
	}

	if err := h.db.Delete(&models.StoryNode{}, id).Error; err != nil {
		logger.Error("Failed to delete story node",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "删除故事节点失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "删除成功",
	})
}

// GetNodeConnections 获取节点连接
// @Summary 获取节点连接列表
// @Description 获取指定故事线的所有节点连接
// @Tags NodeConnections
// @Accept json
// @Produce json
// @Param storylineId query int true "故事线ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/node-connections [get]
func (h *StorylineHandler) GetNodeConnections(c *gin.Context) {
	storylineIdStr := c.Query("storylineId")
	if storylineIdStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "缺少故事线ID参数",
		})
		return
	}

	storylineId, err := strconv.Atoi(storylineIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的故事线ID",
		})
		return
	}

	var connections []models.NodeConnection
	if err := h.db.Joins("JOIN story_nodes ON story_nodes.id = node_connections.from_node_id").
		Where("story_nodes.storyline_id = ?", storylineId).
		Preload("FromNode").
		Preload("ToNode").
		Find(&connections).Error; err != nil {
		logger.Error("Failed to get node connections",
			zap.Int("storylineId", storylineId),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "获取节点连接失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": connections,
	})
}

// CreateNodeConnection 创建节点连接
// @Summary 创建节点连接
// @Description 创建新的节点连接
// @Tags NodeConnections
// @Accept json
// @Produce json
// @Param request body models.NodeConnection true "节点连接信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/node-connections [post]
func (h *StorylineHandler) CreateNodeConnection(c *gin.Context) {
	var connection models.NodeConnection
	if err := c.ShouldBindJSON(&connection); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	if err := h.db.Create(&connection).Error; err != nil {
		logger.Error("Failed to create node connection",
			zap.Int("fromNodeId", connection.FromNodeID),
			zap.Int("toNodeId", connection.ToNodeID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建节点连接失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "创建成功",
		"data": connection,
	})
}

// DeleteNodeConnection 删除节点连接
// @Summary 删除节点连接
// @Description 删除指定的节点连接
// @Tags NodeConnections
// @Accept json
// @Produce json
// @Param id path int true "节点连接ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/node-connections/{id} [delete]
func (h *StorylineHandler) DeleteNodeConnection(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的节点连接ID",
		})
		return
	}

	if err := h.db.Delete(&models.NodeConnection{}, id).Error; err != nil {
		logger.Error("Failed to delete node connection",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "删除节点连接失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "删除成功",
	})
}

// RegisterStorylineRoutes 注册故事线相关路由
func RegisterStorylineRoutes(r *gin.RouterGroup, db *gorm.DB) {
	handler := NewStorylineHandler(db)

	// 故事线路由
	r.GET("/storylines/:novelId", handler.GetStorylines)
	r.POST("/storylines", handler.CreateStoryline)
	r.PUT("/storylines/:id", handler.UpdateStoryline)
	r.DELETE("/storylines/:id", handler.DeleteStoryline)

	// 故事节点路由
	r.GET("/story-nodes/:storylineId", handler.GetStoryNodes)
	r.POST("/story-nodes", handler.CreateStoryNode)
	r.PUT("/story-nodes/:id", handler.UpdateStoryNode)
	r.DELETE("/story-nodes/:id", handler.DeleteStoryNode)

	// 节点连接路由
	r.GET("/node-connections", handler.GetNodeConnections)
	r.POST("/node-connections", handler.CreateNodeConnection)
	r.DELETE("/node-connections/:id", handler.DeleteNodeConnection)
}
