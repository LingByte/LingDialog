package bootstrap

import (
	"strconv"
	"time"

	"github.com/code-100-precent/LingFramework/internal/models"
	"github.com/code-100-precent/LingFramework/pkg/config"
	"github.com/code-100-precent/LingFramework/pkg/constants"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/code-100-precent/LingFramework/pkg/utils"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type SeedService struct {
	db *gorm.DB
}

func (s *SeedService) SeedAll() error {
	if err := s.seedConfigs(); err != nil {
		return err
	}

	if err := s.seedUsers(); err != nil {
		return err
	}

	return nil
}

func (s *SeedService) seedConfigs() error {
	apiPrefix := config.GlobalConfig.APIPrefix
	defaults := []utils.Config{
		{Key: constants.KEY_SITE_URL, Desc: "Site URL", Autoload: true, Public: true, Format: "text", Value: func() string {
			if config.GlobalConfig.ServerUrl != "" {
				return config.GlobalConfig.ServerUrl
			}
			return "https://lingecho.com"
		}()},
		{Key: constants.KEY_SITE_NAME, Desc: "Site Name", Autoload: true, Public: true, Format: "text", Value: func() string {
			if config.GlobalConfig.ServerName != "" {
				return config.GlobalConfig.ServerName
			}
			return "LingEcho"
		}()},
		{Key: constants.KEY_SITE_LOGO_URL, Desc: "Site Logo", Autoload: true, Public: true, Format: "text", Value: func() string {
			if config.GlobalConfig.ServerLogo != "" {
				return config.GlobalConfig.ServerLogo
			}
			return "/static/img/favicon.png"
		}()},
		{Key: constants.KEY_SITE_DESCRIPTION, Desc: "Site Description", Autoload: true, Public: true, Format: "text", Value: func() string {
			if config.GlobalConfig.ServerDesc != "" {
				return config.GlobalConfig.ServerDesc
			}
			return "LingEcho - Intelligent Voice Customer Service Platform"
		}()},
		{Key: constants.KEY_SITE_TERMS_URL, Desc: "Terms of Service", Autoload: true, Public: true, Format: "text", Value: func() string {
			if config.GlobalConfig.ServerTermsUrl != "" {
				return config.GlobalConfig.ServerTermsUrl
			}
			return "https://lingecho.com"
		}()},
		{Key: constants.KEY_SITE_SIGNIN_URL, Desc: "Sign In Page", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/auth/login"},
		{Key: constants.KEY_SITE_FAVICON_URL, Desc: "Favicon URL", Autoload: true, Public: true, Format: "text", Value: "/static/img/favicon.png"},
		{Key: constants.KEY_SITE_SIGNUP_URL, Desc: "Sign Up Page", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/auth/register"},
		{Key: constants.KEY_SITE_LOGOUT_URL, Desc: "Logout Page", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/auth/logout"},
		{Key: constants.KEY_SITE_RESET_PASSWORD_URL, Desc: "Reset Password Page", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/auth/reset-password"},
		{Key: constants.KEY_SITE_SIGNIN_API, Desc: "Sign In API", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/auth/login"},
		{Key: constants.KEY_SITE_SIGNUP_API, Desc: "Sign Up API", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/auth/register"},
		{Key: constants.KEY_SITE_RESET_PASSWORD_DONE_API, Desc: "Reset Password API", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/auth/reset-password-done"},
		{Key: constants.KEY_SITE_LOGIN_NEXT, Desc: "Login Redirect Page", Autoload: true, Public: true, Format: "text", Value: apiPrefix + "/admin/"},
		{Key: constants.KEY_SITE_USER_ID_TYPE, Desc: "User ID Type", Autoload: true, Public: true, Format: "text", Value: "email"},
		// Search configuration
		{Key: constants.KEY_SEARCH_ENABLED, Desc: "Search Feature Enabled", Autoload: true, Public: true, Format: "bool", Value: func() string {
			if config.GlobalConfig.SearchEnabled {
				return "true"
			}
			return "false"
		}()},
		{Key: constants.KEY_SEARCH_PATH, Desc: "Search Index Path", Autoload: true, Public: false, Format: "text", Value: func() string {
			if config.GlobalConfig.SearchPath != "" {
				return config.GlobalConfig.SearchPath
			}
			return "./search"
		}()},
		{Key: constants.KEY_SEARCH_BATCH_SIZE, Desc: "Search Batch Size", Autoload: true, Public: false, Format: "int", Value: func() string {
			if config.GlobalConfig.SearchBatchSize > 0 {
				return strconv.Itoa(config.GlobalConfig.SearchBatchSize)
			}
			return "100"
		}()},
		{Key: constants.KEY_SEARCH_INDEX_SCHEDULE, Desc: "Search Index Schedule (Cron)", Autoload: true, Public: false, Format: "text", Value: "0 */6 * * *"}, // Execute every 6 hours
	}
	for _, cfg := range defaults {
		var count int64
		err := s.db.Model(&utils.Config{}).Where("`key` = ?", cfg.Key).Count(&count).Error
		if err != nil {
			return err
		}
		if count == 0 {
			if err := s.db.Create(&cfg).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

// seedUsers 创建默认用户
func (s *SeedService) seedUsers() error {
	// 检查是否已存在管理员用户
	var count int64
	err := s.db.Model(&models.User{}).Where("email = ?", "admin@lingecho.com").Count(&count).Error
	if err != nil {
		return err
	}

	// 如果管理员用户不存在，则创建
	if count == 0 {
		// 加密密码
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			logger.Error("Failed to hash admin password", zap.Error(err))
			return err
		}

		// 创建管理员用户
		adminUser := &models.User{
			Email:         "admin@lingecho.com",
			Password:      string(hashedPassword),
			DisplayName:   "系统管理员",
			FirstName:     "系统",
			LastName:      "管理员",
			Role:          "admin",
			Enabled:       true,
			Activated:     true,
			EmailVerified: true,
			LoginCount:    0,
			ProfileComplete: models.CalculateProfileComplete(&models.User{
				DisplayName:   "系统管理员",
				FirstName:     "系统",
				LastName:      "管理员",
				Email:         "admin@lingecho.com",
				EmailVerified: true,
			}),
			Timezone: "Asia/Shanghai",
			Locale:   "zh-CN",
		}

		// 设置创建时间
		now := time.Now()
		adminUser.CreatedAt = now
		adminUser.UpdatedAt = now

		if err := s.db.Create(adminUser).Error; err != nil {
			logger.Error("Failed to create admin user", zap.Error(err))
			return err
		}

		logger.Info("Admin user created successfully",
			zap.String("email", "admin@lingecho.com"),
			zap.String("password", "admin123"),
			zap.String("role", "admin"))
	} else {
		logger.Info("Admin user already exists, skipping creation")
	}

	// 创建测试用户（可选）
	err = s.db.Model(&models.User{}).Where("email = ?", "test@lingecho.com").Count(&count).Error
	if err != nil {
		return err
	}

	if count == 0 {
		// 加密密码
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("test123"), bcrypt.DefaultCost)
		if err != nil {
			logger.Error("Failed to hash test user password", zap.Error(err))
			return err
		}

		// 创建测试用户
		testUser := &models.User{
			Email:         "test@lingecho.com",
			Password:      string(hashedPassword),
			DisplayName:   "测试用户",
			FirstName:     "测试",
			LastName:      "用户",
			Role:          "user",
			Enabled:       true,
			Activated:     true,
			EmailVerified: true,
			LoginCount:    0,
			ProfileComplete: models.CalculateProfileComplete(&models.User{
				DisplayName:   "测试用户",
				FirstName:     "测试",
				LastName:      "用户",
				Email:         "test@lingecho.com",
				EmailVerified: true,
			}),
			Timezone: "Asia/Shanghai",
			Locale:   "zh-CN",
		}

		// 设置创建时间
		now := time.Now()
		testUser.CreatedAt = now
		testUser.UpdatedAt = now

		if err := s.db.Create(testUser).Error; err != nil {
			logger.Error("Failed to create test user", zap.Error(err))
			return err
		}

		logger.Info("Test user created successfully",
			zap.String("email", "test@lingecho.com"),
			zap.String("password", "test123"),
			zap.String("role", "user"))
	} else {
		logger.Info("Test user already exists, skipping creation")
	}

	return nil
}
