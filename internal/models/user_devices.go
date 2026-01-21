package models

import (
	"time"

	"gorm.io/gorm"
)

// UserDevice 用户设备模型
type UserDevice struct {
	BaseModel
	UserID      uint       `json:"userId" gorm:"not null;index"`
	DeviceID    string     `json:"deviceId" gorm:"size:64;not null;index"` // 设备唯一标识
	DeviceName  string     `json:"deviceName" gorm:"size:128"`             // 设备名称
	DeviceType  string     `json:"deviceType" gorm:"size:32"`              // 设备类型：mobile, tablet, desktop
	OS          string     `json:"os" gorm:"size:64"`                      // 操作系统
	Browser     string     `json:"browser" gorm:"size:64"`                 // 浏览器
	UserAgent   string     `json:"userAgent" gorm:"type:text"`             // User-Agent
	IPAddress   string     `json:"ipAddress" gorm:"size:64"`               // IP地址
	Location    string     `json:"location" gorm:"size:128"`               // 地理位置
	IsTrusted   bool       `json:"isTrusted" gorm:"default:false"`         // 是否信任设备
	IsActive    bool       `json:"isActive" gorm:"default:true"`           // 是否活跃
	LastLoginAt *time.Time `json:"lastLoginAt"`                            // 最后登录时间
	FirstSeenAt time.Time  `json:"firstSeenAt" gorm:"not null"`            // 首次见到时间
	TrustExpiry *time.Time `json:"trustExpiry"`                            // 信任过期时间

	// 关联
	User User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName 指定表名
func (UserDevice) TableName() string {
	return "user_devices"
}

// IsExpired 检查设备信任是否过期
func (ud *UserDevice) IsExpired() bool {
	if !ud.IsTrusted || ud.TrustExpiry == nil {
		return false
	}
	return time.Now().After(*ud.TrustExpiry)
}

// IsTrustedAndValid 检查设备是否受信任且有效
func (ud *UserDevice) IsTrustedAndValid() bool {
	return ud.IsTrusted && ud.IsActive && !ud.IsExpired()
}

// GetOrCreateUserDevice 获取或创建用户设备
func GetOrCreateUserDevice(db *gorm.DB, userID uint, deviceID, deviceName, deviceType, os, browser, userAgent, ipAddress, location string) (*UserDevice, bool, error) {
	var device UserDevice

	// 先尝试查找现有设备
	err := db.Where("user_id = ? AND device_id = ?", userID, deviceID).First(&device).Error
	if err == nil {
		// 设备已存在，更新最后登录时间和其他信息
		now := time.Now()
		updates := map[string]interface{}{
			"last_login_at": &now,
			"ip_address":    ipAddress,
			"location":      location,
			"is_active":     true,
		}

		// 如果设备信息有变化，也更新
		if device.DeviceName != deviceName && deviceName != "" {
			updates["device_name"] = deviceName
		}
		if device.UserAgent != userAgent && userAgent != "" {
			updates["user_agent"] = userAgent
		}

		err = db.Model(&device).Updates(updates).Error
		if err != nil {
			return nil, false, err
		}

		// 重新加载设备信息
		err = db.Where("user_id = ? AND device_id = ?", userID, deviceID).First(&device).Error
		return &device, false, err
	}

	if err != gorm.ErrRecordNotFound {
		return nil, false, err
	}

	// 设备不存在，创建新设备
	now := time.Now()
	device = UserDevice{
		UserID:      userID,
		DeviceID:    deviceID,
		DeviceName:  deviceName,
		DeviceType:  deviceType,
		OS:          os,
		Browser:     browser,
		UserAgent:   userAgent,
		IPAddress:   ipAddress,
		Location:    location,
		IsTrusted:   false, // 新设备默认不信任
		IsActive:    true,
		LastLoginAt: &now,
		FirstSeenAt: now,
	}

	err = db.Create(&device).Error
	return &device, true, err
}

// GetUserDevices 获取用户的所有设备
func GetUserDevices(db *gorm.DB, userID uint) ([]UserDevice, error) {
	var devices []UserDevice
	err := db.Where("user_id = ?", userID).Order("last_login_at DESC").Find(&devices).Error
	return devices, err
}

// TrustDevice 信任设备
func TrustDevice(db *gorm.DB, userID uint, deviceID string, trustDays int) error {
	var expiry *time.Time
	if trustDays > 0 {
		expiryTime := time.Now().AddDate(0, 0, trustDays)
		expiry = &expiryTime
	}

	return db.Model(&UserDevice{}).
		Where("user_id = ? AND device_id = ?", userID, deviceID).
		Updates(map[string]interface{}{
			"is_trusted":   true,
			"trust_expiry": expiry,
		}).Error
}

// UntrustDevice 取消信任设备
func UntrustDevice(db *gorm.DB, userID uint, deviceID string) error {
	return db.Model(&UserDevice{}).
		Where("user_id = ? AND device_id = ?", userID, deviceID).
		Updates(map[string]interface{}{
			"is_trusted":   false,
			"trust_expiry": nil,
		}).Error
}

// DeleteUserDevice 删除用户设备
func DeleteUserDevice(db *gorm.DB, userID uint, deviceID string) error {
	return db.Where("user_id = ? AND device_id = ?", userID, deviceID).Delete(&UserDevice{}).Error
}

// CleanupInactiveDevices 清理不活跃的设备（超过指定天数未登录）
func CleanupInactiveDevices(db *gorm.DB, inactiveDays int) error {
	cutoff := time.Now().AddDate(0, 0, -inactiveDays)
	return db.Where("last_login_at < ? OR last_login_at IS NULL", cutoff).Delete(&UserDevice{}).Error
}

// GetTrustedDeviceCount 获取用户信任设备数量
func GetTrustedDeviceCount(db *gorm.DB, userID uint) (int64, error) {
	var count int64
	err := db.Model(&UserDevice{}).
		Where("user_id = ? AND is_trusted = ? AND is_active = ?", userID, true, true).
		Count(&count).Error
	return count, err
}

// IsDeviceTrusted 检查设备是否受信任
func IsDeviceTrusted(db *gorm.DB, userID uint, deviceID string) (bool, error) {
	var device UserDevice
	err := db.Where("user_id = ? AND device_id = ?", userID, deviceID).First(&device).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return false, nil // 设备不存在，不信任
		}
		return false, err
	}

	return device.IsTrustedAndValid(), nil
}
