package storage

import (
	"io"
	"time"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/lingstorage-sdk-go"
)

// GetClient 获取全局存储客户端
// 返回已初始化的 lingstorage 客户端实例
func GetClient() *lingstorage.Client {
	return config.GlobalStore
}

// Ping 检查存储服务连接状态
func Ping() error {
	if config.GlobalStore == nil {
		return ErrStorageNotConfigured
	}
	return config.GlobalStore.Ping()
}

// UploadFromReader 从 Reader 上传文件到存储服务
// reader: 文件内容读取器
// filename: 文件名（用于确定 Content-Type）
// key: 文件在存储中的路径/键名
// 返回: 上传结果和可能的错误
func UploadFromReader(reader io.Reader, filename, key string) (*lingstorage.UploadResult, error) {
	if config.GlobalStore == nil {
		return nil, ErrStorageNotConfigured
	}

	return config.GlobalStore.UploadFromReader(&lingstorage.UploadFromReaderRequest{
		Reader:   reader,
		Bucket:   config.GlobalConfig.LingstorageBucket,
		Filename: filename,
		Key:      key,
	})
}

// UploadFromReaderWithBucket 从 Reader 上传文件到指定存储桶
func UploadFromReaderWithBucket(reader io.Reader, filename, key, bucket string) (*lingstorage.UploadResult, error) {
	if config.GlobalStore == nil {
		return nil, ErrStorageNotConfigured
	}

	return config.GlobalStore.UploadFromReader(&lingstorage.UploadFromReaderRequest{
		Reader:   reader,
		Bucket:   bucket,
		Filename: filename,
		Key:      key,
	})
}

// UploadBytes 上传字节数据到存储服务
// data: 要上传的字节数据
// filename: 文件名（用于确定 Content-Type）
// key: 文件在存储中的路径/键名
// 返回: 上传结果和可能的错误
func UploadBytes(data []byte, filename, key string) (*lingstorage.UploadResult, error) {
	if config.GlobalStore == nil {
		return nil, ErrStorageNotConfigured
	}

	return config.GlobalStore.UploadBytes(&lingstorage.UploadBytesRequest{
		Bucket:   config.GlobalConfig.LingstorageBucket,
		Data:     data,
		Filename: filename,
		Key:      key,
	})
}

// UploadBytesWithBucket 上传字节数据到指定存储桶
func UploadBytesWithBucket(data []byte, filename, key, bucket string) (*lingstorage.UploadResult, error) {
	if config.GlobalStore == nil {
		return nil, ErrStorageNotConfigured
	}

	return config.GlobalStore.UploadBytes(&lingstorage.UploadBytesRequest{
		Bucket:   bucket,
		Data:     data,
		Filename: filename,
		Key:      key,
	})
}

// Delete 删除存储中的文件
func Delete(key string) error {
	if config.GlobalStore == nil {
		return ErrStorageNotConfigured
	}

	return config.GlobalStore.DeleteFile(config.GlobalConfig.LingstorageBucket, key)
}

// DeleteWithBucket 删除指定存储桶中的文件
func DeleteWithBucket(key, bucket string) error {
	if config.GlobalStore == nil {
		return ErrStorageNotConfigured
	}

	return config.GlobalStore.DeleteFile(bucket, key)
}

// GetURL 获取文件的访问 URL（永久有效）
func GetURL(key string) (string, error) {
	if config.GlobalStore == nil {
		return "", ErrStorageNotConfigured
	}

	return config.GlobalStore.GetFileURL(config.GlobalConfig.LingstorageBucket, key, 0)
}

// GetURLWithBucket 获取指定存储桶中文件的访问 URL（永久有效）
func GetURLWithBucket(key, bucket string) (string, error) {
	if config.GlobalStore == nil {
		return "", ErrStorageNotConfigured
	}

	return config.GlobalStore.GetFileURL(bucket, key, 0)
}

// GetSignedURL 获取文件的签名 URL（用于私有文件访问）
// key: 文件键名
// expireSeconds: URL 过期时间（秒）
func GetSignedURL(key string, expireSeconds int) (string, error) {
	if config.GlobalStore == nil {
		return "", ErrStorageNotConfigured
	}

	return config.GlobalStore.GetFileURL(
		config.GlobalConfig.LingstorageBucket,
		key,
		time.Duration(expireSeconds)*time.Second,
	)
}

// GetSignedURLWithBucket 获取指定存储桶中文件的签名 URL
func GetSignedURLWithBucket(key, bucket string, expireSeconds int) (string, error) {
	if config.GlobalStore == nil {
		return "", ErrStorageNotConfigured
	}

	return config.GlobalStore.GetFileURL(
		bucket,
		key,
		time.Duration(expireSeconds)*time.Second,
	)
}

// GetFileInfo 获取文件信息
func GetFileInfo(key string) (*lingstorage.FileInfo, error) {
	if config.GlobalStore == nil {
		return nil, ErrStorageNotConfigured
	}

	return config.GlobalStore.GetFileInfo(config.GlobalConfig.LingstorageBucket, key)
}

// GetFileInfoWithBucket 获取指定存储桶中文件的信息
func GetFileInfoWithBucket(key, bucket string) (*lingstorage.FileInfo, error) {
	if config.GlobalStore == nil {
		return nil, ErrStorageNotConfigured
	}

	return config.GlobalStore.GetFileInfo(bucket, key)
}

// IsConfigured 检查存储服务是否已配置
func IsConfigured() bool {
	return config.GlobalStore != nil
}
