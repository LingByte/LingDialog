package storage

import "errors"

var (
	// ErrStorageNotConfigured 存储服务未配置错误
	ErrStorageNotConfigured = errors.New("storage service not configured")

	// ErrInvalidPath 无效的文件路径错误
	ErrInvalidPath = errors.New("invalid file path")

	// ErrFileNotFound 文件不存在错误
	ErrFileNotFound = errors.New("file not found")

	// ErrUploadFailed 上传失败错误
	ErrUploadFailed = errors.New("upload failed")

	// ErrDeleteFailed 删除失败错误
	ErrDeleteFailed = errors.New("delete failed")
)
