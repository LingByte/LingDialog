package middleware

import (
	"net/http"

	"github.com/code-100-precent/LingFramework/internal/models"
	"github.com/code-100-precent/LingFramework/pkg/constants"
	"github.com/code-100-precent/LingFramework/pkg/utils/response"
	"github.com/gin-gonic/gin"
)

// RequireAuth 中间件：要求用户必须登录
func RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := models.CurrentUser(c)
		if user == nil {
			response.AbortWithStatus(c, http.StatusUnauthorized)
			return
		}

		// 将用户信息存储到上下文中，方便后续使用
		c.Set(constants.UserField, user)
		c.Next()
	}
}

// RequireAdmin 中间件：要求用户必须是管理员
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := models.CurrentUser(c)
		if user == nil {
			response.AbortWithStatus(c, http.StatusUnauthorized)
			return
		}

		if user.Role != "admin" {
			response.AbortWithStatus(c, http.StatusForbidden)
			return
		}

		c.Set(constants.UserField, user)
		c.Next()
	}
}

// OptionalAuth 中间件：可选认证，不强制要求登录
func OptionalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := models.CurrentUser(c)
		if user != nil {
			c.Set(constants.UserField, user)
		}
		c.Next()
	}
}

// RequireRole 中间件：要求用户具有特定角色
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := models.CurrentUser(c)
		if user == nil {
			response.AbortWithStatus(c, http.StatusUnauthorized)
			return
		}

		// 检查用户角色是否在允许的角色列表中
		hasRole := false
		for _, role := range roles {
			if user.Role == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			response.AbortWithStatus(c, http.StatusForbidden)
			return
		}

		c.Set(constants.UserField, user)
		c.Next()
	}
}

// GetCurrentUser 从上下文中获取当前用户
func GetCurrentUser(c *gin.Context) *models.User {
	if user, exists := c.Get(constants.UserField); exists {
		if u, ok := user.(*models.User); ok {
			return u
		}
	}
	return nil
}
