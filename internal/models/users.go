package models

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	LingEcho "github.com/LingByte/LingDialog"
	"github.com/LingByte/LingDialog/pkg/constants"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/LingByte/LingDialog/pkg/utils"
	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

const (
	// SigUserLogin : user *User, c *gin.Context
	SigUserLogin = "user.login"
	// SigUserLogout : user *User, c *gin.Context
	SigUserLogout = "user.logout"
	// SigUserCreate : user *User, c *gin.Context
	SigUserCreate = "user.create"
	// SigUserVerifyEmail : user *User, hash, clientIp, userAgent string
	SigUserVerifyEmail = "user.verifyemail"
	// SigUserResetPassword : user *User, hash, clientIp, userAgent string
	SigUserResetPassword = "user.resetpassword"
)

type EmailOperatorForm struct {
	UserName    string `json:"userName"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email" comment:"Email address"`
	Code        string `json:"code"`
	Password    string `json:"password"`
	AuthToken   bool   `json:"AuthToken,omitempty"`
	Timezone    string `json:"timezone,omitempty"`
	CaptchaID   string `json:"captchaId,omitempty"`
	CaptchaCode string `json:"captchaCode,omitempty"`
}

type User struct {
	BaseModel
	Email                 string     `json:"email" gorm:"size:128;uniqueIndex"`
	Password              string     `json:"-" gorm:"size:128"`
	Phone                 string     `json:"phone,omitempty" gorm:"size:64;index"`
	FirstName             string     `json:"firstName,omitempty" gorm:"size:128"`
	LastName              string     `json:"lastName,omitempty" gorm:"size:128"`
	DisplayName           string     `json:"displayName,omitempty" gorm:"size:128"`
	IsStaff               bool       `json:"isStaff,omitempty"`
	Enabled               bool       `json:"-"`
	Activated             bool       `json:"-"`
	LastLogin             *time.Time `json:"lastLogin,omitempty"`
	LastLoginIP           string     `json:"-" gorm:"size:128"`
	Source                string     `json:"-" gorm:"size:64;index"`
	Locale                string     `json:"locale,omitempty" gorm:"size:20"`
	Timezone              string     `json:"timezone,omitempty" gorm:"size:200"`
	AuthToken             string     `json:"token,omitempty" gorm:"-"`
	Avatar                string     `json:"avatar,omitempty"`
	Gender                string     `json:"gender,omitempty"`
	City                  string     `json:"city,omitempty"`
	Region                string     `json:"region,omitempty"`
	Country               string     `json:"country,omitempty"`
	HasFilledDetails      bool       `json:"hasFilledDetails"`
	EmailNotifications    bool       `json:"emailNotifications"`                           // 邮件通知
	PushNotifications     bool       `json:"pushNotifications" gorm:"default:true"`        // 推送通知
	SystemNotifications   bool       `json:"systemNotifications" gorm:"default:true"`      // 系统通知
	AutoCleanUnreadEmails bool       `json:"autoCleanUnreadEmails" gorm:"default:false"`   // 自动清理七天未读邮件
	EmailVerified         bool       `json:"emailVerified" gorm:"default:false"`           // 邮箱已验证
	PhoneVerified         bool       `json:"phoneVerified" gorm:"default:false"`           // 手机已验证
	TwoFactorEnabled      bool       `json:"twoFactorEnabled" gorm:"default:false"`        // 双因素认证
	TwoFactorSecret       string     `json:"-" gorm:"size:128"`                            // 双因素认证密钥
	EmailVerifyToken      string     `json:"-" gorm:"size:128"`                            // 邮箱验证令牌
	PhoneVerifyToken      string     `json:"-" gorm:"size:128"`                            // 手机验证令牌
	PasswordResetToken    string     `json:"-" gorm:"size:128"`                            // 密码重置令牌
	PasswordResetExpires  *time.Time `json:"-"`                                            // 密码重置过期时间
	EmailVerifyExpires    *time.Time `json:"-"`                                            // 邮箱验证过期时间
	LoginCount            int        `json:"loginCount" gorm:"default:0"`                  // 登录次数
	LastPasswordChange    *time.Time `json:"lastPasswordChange,omitempty"`                 // 最后密码修改时间
	ProfileComplete       int        `json:"profileComplete" gorm:"default:0"`             // 资料完整度百分比
	Role                  string     `json:"role,omitempty" gorm:"size:50;default:'user'"` // 用户角色
	Permissions           string     `json:"permissions,omitempty" gorm:"type:text"`       // 用户权限JSON
}

// TableName 指定 User 模型的表名
func (User) TableName() string {
	return constants.TABLE_USER
}

func CurrentUser(c *gin.Context) *User {
	if cachedObj, exists := c.Get(constants.UserField); exists && cachedObj != nil {
		return cachedObj.(*User)
	}

	// 首先尝试从Authorization header获取token
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token != "" {
			// 解析token获取用户ID
			userID := parseTokenToUserID(token)
			if userID > 0 {
				db := c.MustGet(constants.DbField).(*gorm.DB)
				user, err := GetUserByUID(db, userID)
				if err == nil {
					c.Set(constants.UserField, user)
					return user
				}
			}
		}
	}

	// 如果token认证失败，尝试session认证
	session := sessions.Default(c)
	userId := session.Get(constants.UserField)
	if userId == nil {
		return nil
	}
	db := c.MustGet(constants.DbField).(*gorm.DB)
	user, err := GetUserByUID(db, userId.(uint))
	if err != nil {
		return nil
	}
	c.Set(constants.UserField, user)
	return user
}

// parseTokenToUserID 解析token获取用户ID
// 这里使用简单的token格式: "user_" + userID + "_" + timestamp + "_" + random
func parseTokenToUserID(token string) uint {
	parts := strings.Split(token, "_")
	if len(parts) >= 2 && parts[0] == "user" {
		if userID, err := strconv.ParseUint(parts[1], 10, 32); err == nil {
			return uint(userID)
		}
	}
	return 0
}

func GetUserByUID(db *gorm.DB, userID uint) (*User, error) {
	var val User
	result := db.Where("id", userID).Where("enabled", true).Take(&val)
	if result.Error != nil {
		return nil, result.Error
	}
	return &val, nil
}

func Logout(c *gin.Context, user *User) {
	c.Set(constants.UserField, nil)
	session := sessions.Default(c)
	session.Delete(constants.UserField)
	session.Save()
	utils.Sig().Emit(constants.SigUserLogout, user, c)
}

func GetUserByEmail(db *gorm.DB, email string) (user *User, err error) {
	var val User
	result := db.Table("users").Where("email", strings.ToLower(email)).Take(&val)
	if result.Error != nil {
		return nil, result.Error
	}
	return &val, nil
}

func CheckUserAllowLogin(db *gorm.DB, user *User) error {
	if !user.Enabled {
		return errors.New("user not allow login")
	}

	if utils.GetBoolValue(db, constants.KEY_USER_ACTIVATED) && !user.Activated {
		return errors.New("waiting for activation")
	}
	return nil
}

func InTimezone(c *gin.Context, timezone string) {
	tz, err := time.LoadLocation(timezone)
	if err != nil {
		return
	}
	c.Set(constants.TzField, tz)

	session := sessions.Default(c)
	session.Set(constants.TzField, timezone)
	session.Save()
}

// Login Handle-User-Login
func Login(c *gin.Context, user *User) {
	db := c.MustGet(constants.DbField).(*gorm.DB)
	err := SetLastLogin(db, user, c.ClientIP())
	if err != nil {
		logger.Error("user.login", zap.Error(err))
		LingEcho.AbortWithJSONError(c, http.StatusInternalServerError, err)
		return
	}

	// Increase login count
	err = IncrementLoginCount(db, user)
	if err != nil {
		logger.Error("user.login", zap.Error(err))
		LingEcho.AbortWithJSONError(c, http.StatusInternalServerError, err)
		return
	}

	// Update profile completeness
	err = UpdateProfileComplete(db, user)
	if err != nil {
		logger.Error("user.login", zap.Error(err))
		LingEcho.AbortWithJSONError(c, http.StatusInternalServerError, err)
		return
	}

	session := sessions.Default(c)
	session.Set(constants.UserField, user.ID)
	session.Save()
	utils.Sig().Emit(SigUserLogin, user, db)
}

func UpdateUserFields(db *gorm.DB, user *User, vals map[string]any) error {
	result := db.Model(user).Updates(vals)
	return result.Error
}

func SetLastLogin(db *gorm.DB, user *User, lastIp string) error {
	now := time.Now().Truncate(1 * time.Second)
	vals := map[string]any{
		"LastLoginIP": lastIp,
		"LastLogin":   &now,
	}
	user.LastLogin = &now
	user.LastLoginIP = lastIp
	result := db.Model(user).Updates(vals)
	return result.Error
}

// IncrementLoginCount 增加登录次数
func IncrementLoginCount(db *gorm.DB, user *User) error {
	err := UpdateUserFields(db, user, map[string]any{
		"LoginCount": user.LoginCount + 1,
	})
	if err != nil {
		return err
	}

	user.LoginCount++
	return nil
}

// UpdateProfileComplete 更新资料完整度
func UpdateProfileComplete(db *gorm.DB, user *User) error {
	complete := CalculateProfileComplete(user)
	err := UpdateUserFields(db, user, map[string]any{
		"ProfileComplete": complete,
	})
	if err != nil {
		return err
	}

	user.ProfileComplete = complete
	return nil
}

// CalculateProfileComplete 计算资料完整度
func CalculateProfileComplete(user *User) int {
	complete := 0
	total := 0

	// 基本信息 (40%)
	total += 4
	if user.DisplayName != "" {
		complete++
	}
	if user.FirstName != "" {
		complete++
	}
	if user.LastName != "" {
		complete++
	}
	if user.Avatar != "" {
		complete++
	}

	// 联系方式 (30%)
	total += 3
	if user.Email != "" {
		complete++
	}
	if user.Phone != "" {
		complete++
	}
	if user.EmailVerified {
		complete++
	}

	// 地址信息 (20%)
	total += 2
	if user.City != "" {
		complete++
	}

	// 偏好设置 (10%)
	total += 1
	if user.Timezone != "" {
		complete++
	}

	percentage := (complete * 100) / total
	if percentage > 100 {
		percentage = 100
	}

	return percentage
}
