package storage

import (
	"bytes"
	"testing"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/lingstorage-sdk-go"
	"github.com/stretchr/testify/assert"
)

func TestIsConfigured(t *testing.T) {
	// 保存原始配置
	originalStore := config.GlobalStore

	// 测试未配置的情况
	config.GlobalStore = nil
	assert.False(t, IsConfigured())

	// 测试已配置的情况
	config.GlobalStore = &lingstorage.Client{}
	assert.True(t, IsConfigured())

	// 恢复原始配置
	config.GlobalStore = originalStore
}

func TestUploadNotConfigured(t *testing.T) {
	// 保存原始配置
	originalStore := config.GlobalStore

	// 设置为未配置状态
	config.GlobalStore = nil

	// 测试上传应该返回错误
	reader := bytes.NewReader([]byte("test content"))
	_, err := Upload("test.txt", reader, 12)
	assert.Error(t, err)
	assert.Equal(t, ErrStorageNotConfigured, err)

	// 恢复原始配置
	config.GlobalStore = originalStore
}

func TestDeleteNotConfigured(t *testing.T) {
	// 保存原始配置
	originalStore := config.GlobalStore

	// 设置为未配置状态
	config.GlobalStore = nil

	// 测试删除应该返回错误
	err := Delete("test.txt")
	assert.Error(t, err)
	assert.Equal(t, ErrStorageNotConfigured, err)

	// 恢复原始配置
	config.GlobalStore = originalStore
}

func TestGetURLNotConfigured(t *testing.T) {
	// 保存原始配置
	originalStore := config.GlobalStore

	// 设置为未配置状态
	config.GlobalStore = nil

	// 测试获取 URL 应该返回错误
	_, err := GetURL("test.txt")
	assert.Error(t, err)
	assert.Equal(t, ErrStorageNotConfigured, err)

	// 恢复原始配置
	config.GlobalStore = originalStore
}

func TestGetSignedURLNotConfigured(t *testing.T) {
	// 保存原始配置
	originalStore := config.GlobalStore

	// 设置为未配置状态
	config.GlobalStore = nil

	// 测试获取签名 URL 应该返回错误
	_, err := GetSignedURL("test.txt", 3600)
	assert.Error(t, err)
	assert.Equal(t, ErrStorageNotConfigured, err)

	// 恢复原始配置
	config.GlobalStore = originalStore
}

func TestGetClient(t *testing.T) {
	// 保存原始配置
	originalStore := config.GlobalStore

	// 测试获取客户端
	mockClient := &lingstorage.Client{}
	config.GlobalStore = mockClient

	client := GetClient()
	assert.Equal(t, mockClient, client)

	// 恢复原始配置
	config.GlobalStore = originalStore
}
