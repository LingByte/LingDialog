package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	LingEcho "github.com/code-100-precent/LingFramework"
	"github.com/code-100-precent/LingFramework/internal/models"
	"github.com/code-100-precent/LingFramework/pkg/constants"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/code-100-precent/LingFramework/pkg/middleware"
	"github.com/code-100-precent/LingFramework/pkg/utils"
	"github.com/code-100-precent/LingFramework/pkg/utils/response"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// handleUserLogout handle user logout
func (h *Handlers) handleUserLogout(c *gin.Context) {
	user := models.CurrentUser(c)
	if user != nil {
		models.Logout(c, user)
	}
	next := c.Query("next")
	if next != "" {
		c.Redirect(http.StatusFound, next)
		return
	}
	response.Success(c, "Logout Success", nil)
}

// handleUserInfo handle user info
func (h *Handlers) handleUserInfo(c *gin.Context) {
	user := middleware.GetCurrentUser(c)

	withToken := c.Query("with_token")
	if withToken != "" {
		expired, err := time.ParseDuration(withToken)
		if err == nil {
			if expired >= 24*time.Hour {
				expired = 24 * time.Hour
			}
			user.AuthToken = generateSimpleToken(user.ID)
		}
	}
	response.Success(c, "success", user)
}

// handleUserSigninByEmail handle user signin by email
func (h *Handlers) handleUserSigninByEmail(c *gin.Context) {
	var form models.EmailOperatorForm
	if err := c.BindJSON(&form); err != nil {
		LingEcho.AbortWithJSONError(c, http.StatusBadRequest, err)
		return
	}

	// 检查邮箱是否为空
	if form.Email == "" {
		LingEcho.AbortWithJSONError(c, http.StatusBadRequest, errors.New("email is required"))
		return
	}

	db := c.MustGet(constants.DbField).(*gorm.DB)
	// 获取用户
	user, err := models.GetUserByEmail(db, form.Email)
	if err != nil {
		response.Fail(c, "user not exists", errors.New("user not exists"))
		return
	}
	if form.Code == "" {
		LingEcho.AbortWithJSONError(c, http.StatusBadRequest, errors.New("verification code is required"))
		return
	}
	// 从缓存中获取验证码
	cachedCode, ok := utils.GlobalCache.Get(form.Email)
	if !ok || cachedCode != form.Code {
		LingEcho.AbortWithJSONError(c, http.StatusBadRequest, errors.New("invalid verification code"))
		return
	}

	// 清除已用验证码
	utils.GlobalCache.Remove(form.Email)
	err = models.CheckUserAllowLogin(db, user)
	if err != nil {
		LingEcho.AbortWithJSONError(c, http.StatusForbidden, err)
		return
	}
	// 设置时区（如果有的话）
	if form.Timezone != "" {
		models.InTimezone(c, form.Timezone)
	}
	// 登录用户，设置 Session
	models.Login(c, user)

	// 生成token
	token := generateSimpleToken(user.ID)

	response.Success(c, "Login successful", gin.H{
		"user":  user,
		"token": token,
	})
}

// handleUserSigninByPassword handle user signin by password
func (h *Handlers) handleUserSigninByPassword(c *gin.Context) {
	var form struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
		Timezone string `json:"timezone,omitempty"`
		Remember bool   `json:"remember,omitempty"`
	}

	if err := c.ShouldBindJSON(&form); err != nil {
		response.Fail(c, "Invalid request", err)
		return
	}

	db := c.MustGet(constants.DbField).(*gorm.DB)

	// 获取用户
	user, err := models.GetUserByEmail(db, form.Email)
	if err != nil {
		response.Fail(c, "Invalid email or password", errors.New("user not found"))
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(form.Password)); err != nil {
		response.Fail(c, "Invalid email or password", errors.New("password mismatch"))
		return
	}

	// 检查用户是否允许登录
	if err := models.CheckUserAllowLogin(db, user); err != nil {
		response.Fail(c, "Login not allowed", err)
		return
	}

	// 设置时区
	if form.Timezone != "" {
		models.InTimezone(c, form.Timezone)
	}

	// 登录用户
	models.Login(c, user)

	// 生成简单的token（这里使用用户ID作为token，实际项目中应该使用JWT）
	token := generateSimpleToken(user.ID)

	response.Success(c, "Login successful", gin.H{
		"user":  user,
		"token": token,
	})
}

// handleUserRegister handle user registration
func (h *Handlers) handleUserRegister(c *gin.Context) {
	var form struct {
		Email       string `json:"email" binding:"required,email"`
		Password    string `json:"password" binding:"required,min=6"`
		DisplayName string `json:"displayName,omitempty"`
		FirstName   string `json:"firstName,omitempty"`
		LastName    string `json:"lastName,omitempty"`
		Code        string `json:"code,omitempty"`
	}

	if err := c.ShouldBindJSON(&form); err != nil {
		response.Fail(c, "Invalid request", err)
		return
	}

	db := c.MustGet(constants.DbField).(*gorm.DB)

	// 检查邮箱是否已存在
	existingUser, _ := models.GetUserByEmail(db, form.Email)
	if existingUser != nil {
		response.Fail(c, "Email already exists", errors.New("email already registered"))
		return
	}

	// 如果需要邮箱验证码
	if form.Code != "" {
		cachedCode, ok := utils.GlobalCache.Get(form.Email + "_register")
		if !ok || cachedCode != form.Code {
			response.Fail(c, "Invalid verification code", errors.New("verification code mismatch"))
			return
		}
		utils.GlobalCache.Remove(form.Email + "_register")
	}

	// 加密密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(form.Password), bcrypt.DefaultCost)
	if err != nil {
		response.Fail(c, "Password encryption failed", err)
		return
	}

	// 创建用户
	user := &models.User{
		Email:       strings.ToLower(form.Email),
		Password:    string(hashedPassword),
		DisplayName: form.DisplayName,
		FirstName:   form.FirstName,
		LastName:    form.LastName,
		Enabled:     true,
		Activated:   true, // 可以根据需要设置为false，需要邮箱验证
		Role:        "user",
	}

	if err := db.Create(user).Error; err != nil {
		logger.Error("Failed to create user", zap.Error(err))
		response.Fail(c, "Registration failed", err)
		return
	}

	// 自动登录
	models.Login(c, user)

	// 生成token
	token := generateSimpleToken(user.ID)

	response.Success(c, "Registration successful", gin.H{
		"user":  user,
		"token": token,
	})
}

// handleSendEmailCode handle sending email verification code
func (h *Handlers) handleSendEmailCode(c *gin.Context) {
	var form struct {
		Email string `json:"email" binding:"required,email"`
		Type  string `json:"type,omitempty"` // login, register, reset
	}

	if err := c.ShouldBindJSON(&form); err != nil {
		response.Fail(c, "Invalid request", err)
		return
	}

	// 生成6位数字验证码
	code := generateVerificationCode()

	// 根据类型设置不同的缓存key和过期时间
	cacheKey := form.Email
	if form.Type == "register" {
		cacheKey = form.Email + "_register"
	} else if form.Type == "reset" {
		cacheKey = form.Email + "_reset"
	}

	// 存储验证码到缓存，5分钟过期
	utils.GlobalCache.Add(cacheKey, code)

	// TODO: 这里应该发送真实的邮件，现在只是模拟
	logger.Info("Email verification code",
		zap.String("email", form.Email),
		zap.String("code", code),
		zap.String("type", form.Type))

	response.Success(c, "Verification code sent", gin.H{
		"message": "Please check your email for verification code",
		// 开发环境下返回验证码，生产环境应该移除
		"code": code,
	})
}

// handleResetPassword handle password reset
func (h *Handlers) handleResetPassword(c *gin.Context) {
	var form struct {
		Email       string `json:"email" binding:"required,email"`
		Code        string `json:"code" binding:"required"`
		NewPassword string `json:"newPassword" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&form); err != nil {
		response.Fail(c, "Invalid request", err)
		return
	}

	// 验证验证码
	cachedCode, ok := utils.GlobalCache.Get(form.Email + "_reset")
	if !ok || cachedCode != form.Code {
		response.Fail(c, "Invalid verification code", errors.New("verification code mismatch"))
		return
	}

	db := c.MustGet(constants.DbField).(*gorm.DB)

	// 获取用户
	user, err := models.GetUserByEmail(db, form.Email)
	if err != nil {
		response.Fail(c, "User not found", err)
		return
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(form.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		response.Fail(c, "Password encryption failed", err)
		return
	}

	// 更新密码
	now := time.Now()
	err = models.UpdateUserFields(db, user, map[string]any{
		"Password":           string(hashedPassword),
		"LastPasswordChange": &now,
	})
	if err != nil {
		response.Fail(c, "Password update failed", err)
		return
	}

	// 清除验证码
	utils.GlobalCache.Remove(form.Email + "_reset")

	response.Success(c, "Password reset successful", nil)
}

// handleUpdateProfile handle user profile update
func (h *Handlers) handleUpdateProfile(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	// 由于使用了 RequireAuth 中间件，这里的 user 不会为 nil

	var form struct {
		DisplayName string `json:"displayName,omitempty"`
		FirstName   string `json:"firstName,omitempty"`
		LastName    string `json:"lastName,omitempty"`
		Phone       string `json:"phone,omitempty"`
		Avatar      string `json:"avatar,omitempty"`
		Gender      string `json:"gender,omitempty"`
		City        string `json:"city,omitempty"`
		Region      string `json:"region,omitempty"`
		Country     string `json:"country,omitempty"`
		Timezone    string `json:"timezone,omitempty"`
		Locale      string `json:"locale,omitempty"`
	}

	if err := c.ShouldBindJSON(&form); err != nil {
		response.Fail(c, "Invalid request", err)
		return
	}

	db := c.MustGet(constants.DbField).(*gorm.DB)

	// 准备更新字段
	updates := make(map[string]any)
	if form.DisplayName != "" {
		updates["DisplayName"] = form.DisplayName
	}
	if form.FirstName != "" {
		updates["FirstName"] = form.FirstName
	}
	if form.LastName != "" {
		updates["LastName"] = form.LastName
	}
	if form.Phone != "" {
		updates["Phone"] = form.Phone
	}
	if form.Avatar != "" {
		updates["Avatar"] = form.Avatar
	}
	if form.Gender != "" {
		updates["Gender"] = form.Gender
	}
	if form.City != "" {
		updates["City"] = form.City
	}
	if form.Region != "" {
		updates["Region"] = form.Region
	}
	if form.Country != "" {
		updates["Country"] = form.Country
	}
	if form.Timezone != "" {
		updates["Timezone"] = form.Timezone
	}
	if form.Locale != "" {
		updates["Locale"] = form.Locale
	}

	if len(updates) == 0 {
		response.Fail(c, "No fields to update", errors.New("no update data"))
		return
	}

	// 更新用户信息
	err := models.UpdateUserFields(db, user, updates)
	if err != nil {
		response.Fail(c, "Update failed", err)
		return
	}

	// 更新资料完整度
	models.UpdateProfileComplete(db, user)

	// 重新获取用户信息
	updatedUser, err := models.GetUserByUID(db, user.ID)
	if err != nil {
		response.Fail(c, "Failed to get updated user", err)
		return
	}

	response.Success(c, "Profile updated successfully", gin.H{
		"user": updatedUser,
	})
}

// generateVerificationCode generates a 6-digit verification code
func generateVerificationCode() string {
	bytes := make([]byte, 3)
	rand.Read(bytes)

	// 将字节转换为数字
	num := int(bytes[0])<<16 | int(bytes[1])<<8 | int(bytes[2])

	// 确保是6位数字
	code := fmt.Sprintf("%06d", num%1000000)
	return code
}

// generateSimpleToken generates a simple token for user authentication
func generateSimpleToken(userID uint) string {
	// 这里使用简单的token生成方式，实际项目中应该使用JWT
	// 格式: "user_" + userID + "_" + timestamp + "_" + random
	timestamp := time.Now().Unix()
	randomBytes := make([]byte, 8)
	rand.Read(randomBytes)
	randomStr := hex.EncodeToString(randomBytes)

	return fmt.Sprintf("user_%d_%d_%s", userID, timestamp, randomStr)
}
