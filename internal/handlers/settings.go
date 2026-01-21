package handlers

import (
	"net/http"
	"strconv"

	"github.com/code-100-precent/LingFramework/internal/models"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// SettingHandler 设定处理器
type SettingHandler struct {
	db *gorm.DB
}

// NewSettingHandler 创建设定处理器
func NewSettingHandler(db *gorm.DB) *SettingHandler {
	return &SettingHandler{
		db: db,
	}
}

// GetSettings 获取小说的所有设定
// @Summary 获取设定列表
// @Description 获取指定小说的所有设定
// @Tags Settings
// @Accept json
// @Produce json
// @Param novelId path int true "小说ID"
// @Param category query string false "设定分类"
// @Success 200 {object} map[string]interface{}
// @Router /api/settings/{novelId} [get]
func (h *SettingHandler) GetSettings(c *gin.Context) {
	novelIdStr := c.Param("novelId")
	novelId, err := strconv.Atoi(novelIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的小说ID",
		})
		return
	}

	category := c.Query("category")

	query := h.db.Where("novel_id = ?", novelId)
	if category != "" {
		query = query.Where("category = ?", category)
	}

	var settings []models.NovelSetting
	if err := query.Order("order_index ASC, created_at ASC").Find(&settings).Error; err != nil {
		logger.Error("Failed to get settings",
			zap.Int("novelId", novelId),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "获取设定失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": settings,
	})
}

// GetSettingsByCategory 按分类获取设定
// @Summary 按分类获取设定
// @Description 获取指定小说按分类分组的设定
// @Tags Settings
// @Accept json
// @Produce json
// @Param novelId path int true "小说ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/settings/{novelId}/by-category [get]
func (h *SettingHandler) GetSettingsByCategory(c *gin.Context) {
	novelIdStr := c.Param("novelId")
	novelId, err := strconv.Atoi(novelIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的小说ID",
		})
		return
	}

	var settings []models.NovelSetting
	if err := h.db.Where("novel_id = ?", novelId).
		Order("category ASC, order_index ASC, created_at ASC").
		Find(&settings).Error; err != nil {
		logger.Error("Failed to get settings",
			zap.Int("novelId", novelId),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "获取设定失败",
		})
		return
	}

	// 按分类分组
	grouped := make(map[string][]models.NovelSetting)
	for _, setting := range settings {
		grouped[setting.Category] = append(grouped[setting.Category], setting)
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "获取成功",
		"data": grouped,
	})
}

// CreateSetting 创建设定
// @Summary 创建设定
// @Description 创建新的设定
// @Tags Settings
// @Accept json
// @Produce json
// @Param request body models.NovelSetting true "设定信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/settings [post]
func (h *SettingHandler) CreateSetting(c *gin.Context) {
	var setting models.NovelSetting
	if err := c.ShouldBindJSON(&setting); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	if err := h.db.Create(&setting).Error; err != nil {
		logger.Error("Failed to create setting",
			zap.String("title", setting.Title),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "创建设定失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "创建成功",
		"data": setting,
	})
}

// UpdateSetting 更新设定
// @Summary 更新设定
// @Description 更新设定信息
// @Tags Settings
// @Accept json
// @Produce json
// @Param id path int true "设定ID"
// @Param request body models.NovelSetting true "设定信息"
// @Success 200 {object} map[string]interface{}
// @Router /api/settings/{id} [put]
func (h *SettingHandler) UpdateSetting(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的设定ID",
		})
		return
	}

	var setting models.NovelSetting
	if err := c.ShouldBindJSON(&setting); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	setting.ID = id

	if err := h.db.Save(&setting).Error; err != nil {
		logger.Error("Failed to update setting",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "更新设定失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "更新成功",
		"data": setting,
	})
}

// DeleteSetting 删除设定
// @Summary 删除设定
// @Description 删除指定的设定
// @Tags Settings
// @Accept json
// @Produce json
// @Param id path int true "设定ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/settings/{id} [delete]
func (h *SettingHandler) DeleteSetting(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "无效的设定ID",
		})
		return
	}

	if err := h.db.Delete(&models.NovelSetting{}, id).Error; err != nil {
		logger.Error("Failed to delete setting",
			zap.Int("id", id),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "删除设定失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "删除成功",
	})
}

// RegisterSettingRoutes 注册设定相关路由
func RegisterSettingRoutes(r *gin.RouterGroup, db *gorm.DB) {
	handler := NewSettingHandler(db)

	r.GET("/settings/:novelId", handler.GetSettings)
	r.GET("/settings/:novelId/by-category", handler.GetSettingsByCategory)
	r.POST("/settings", handler.CreateSetting)
	r.PUT("/settings/:id", handler.UpdateSetting)
	r.DELETE("/settings/:id", handler.DeleteSetting)
}
