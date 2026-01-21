package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/code-100-precent/LingFramework/pkg/llm"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GenerateNovelSettingRequest 生成小说设定请求
type GenerateNovelSettingRequest struct {
	Genre        string   `json:"genre" binding:"required"` // 小说类型
	FixedFields  []string `json:"fixedFields"`              // 固定不变的字段
	Title        string   `json:"title"`                    // 当前标题（如果固定）
	Description  string   `json:"description"`              // 当前简介（如果固定）
	WorldSetting string   `json:"worldSetting"`             // 当前世界观（如果固定）
	Tags         string   `json:"tags"`                     // 当前标签（如果固定）
	Feedback     string   `json:"feedback"`                 // 用户反馈
}

// GenerateNovelSettingResponse 生成小说设定响应
type GenerateNovelSettingResponse struct {
	Title        string `json:"title"`        // 小说标题
	Description  string `json:"description"`  // 小说简介
	WorldSetting string `json:"worldSetting"` // 世界观设定
	Tags         string `json:"tags"`         // 标签
}

// GenerateNovelSetting 生成小说设定
// @Summary 生成小说设定
// @Description 根据类型和用户反馈生成小说标题、简介、世界观等
// @Tags AI
// @Accept json
// @Produce json
// @Param request body GenerateNovelSettingRequest true "生成请求"
// @Success 200 {object} GenerateNovelSettingResponse
// @Router /api/ai/novel/generate-setting [post]
func (h *AIHandler) GenerateNovelSetting(c *gin.Context) {
	if !checkLLMConfigured(c) {
		return
	}

	var req GenerateNovelSettingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"code": 400,
			"msg":  "请求参数错误: " + err.Error(),
		})
		return
	}

	logger.Info("Generate novel setting request",
		zap.String("genre", req.Genre),
		zap.Strings("fixedFields", req.FixedFields),
		zap.String("feedback", req.Feedback))

	// 构建提示词
	prompt := h.buildNovelSettingPrompt(req)

	// 调用 LLM
	messages := []llm.Message{
		{Role: "user", Content: prompt},
	}
	response, err := h.characterGenerator.Chat(messages, 0.7, 2000)
	if err != nil {
		logger.Error("Generate novel setting failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "生成失败: " + err.Error(),
		})
		return
	}

	// 解析响应
	result, err := h.parseNovelSettingResponse(response, req)
	if err != nil {
		logger.Error("Parse novel setting response failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"code": 500,
			"msg":  "解析响应失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code": 200,
		"msg":  "success",
		"data": result,
	})
}

// buildNovelSettingPrompt 构建生成小说设定的提示词
func (h *AIHandler) buildNovelSettingPrompt(req GenerateNovelSettingRequest) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("请为一部%s类型的小说生成以下内容：\n\n", req.Genre))

	// 固定字段
	fixedFieldsMap := make(map[string]bool)
	for _, field := range req.FixedFields {
		fixedFieldsMap[field] = true
	}

	// 如果有固定字段，说明
	if len(req.FixedFields) > 0 {
		sb.WriteString("以下字段已确定，请保持不变：\n")
		if fixedFieldsMap["title"] && req.Title != "" {
			sb.WriteString(fmt.Sprintf("- 标题：%s\n", req.Title))
		}
		if fixedFieldsMap["description"] && req.Description != "" {
			sb.WriteString(fmt.Sprintf("- 简介：%s\n", req.Description))
		}
		if fixedFieldsMap["worldSetting"] && req.WorldSetting != "" {
			sb.WriteString(fmt.Sprintf("- 世界观：%s\n", req.WorldSetting))
		}
		if fixedFieldsMap["tags"] && req.Tags != "" {
			sb.WriteString(fmt.Sprintf("- 标签：%s\n", req.Tags))
		}
		sb.WriteString("\n")
	}

	// 用户反馈
	if req.Feedback != "" {
		sb.WriteString(fmt.Sprintf("用户反馈：%s\n\n", req.Feedback))
	}

	// 需要生成的字段
	sb.WriteString("请生成以下内容（JSON格式）：\n")
	if !fixedFieldsMap["title"] {
		sb.WriteString("- title: 小说标题（字符串，吸引人、符合类型特点）\n")
	}
	if !fixedFieldsMap["description"] {
		sb.WriteString("- description: 小说简介（字符串，200-300字，包含主角、背景、冲突）\n")
	}
	if !fixedFieldsMap["worldSetting"] {
		sb.WriteString("- worldSetting: 世界观设定（字符串，详细描述世界背景、力量体系、社会结构等，用换行符分段）\n")
	}
	if !fixedFieldsMap["tags"] {
		sb.WriteString("- tags: 标签（字符串，3-5个，用逗号分隔）\n")
	}

	sb.WriteString("\n重要：所有字段都必须是字符串类型，不要使用嵌套对象。worldSetting 应该是一个完整的字符串，可以包含换行符。\n")
	sb.WriteString("请直接返回JSON格式，不要包含其他说明文字。")

	return sb.String()
}

// parseNovelSettingResponse 解析小说设定响应
func (h *AIHandler) parseNovelSettingResponse(response string, req GenerateNovelSettingRequest) (*GenerateNovelSettingResponse, error) {
	// 尝试提取 JSON
	response = strings.TrimSpace(response)

	// 移除可能的 markdown 代码块标记
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	// 查找 JSON 对象
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	if start >= 0 && end > start {
		response = response[start : end+1]
	}

	// 先尝试解析为标准格式
	var result GenerateNovelSettingResponse
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		// 如果失败，尝试解析为包含嵌套对象的格式
		var flexResult struct {
			Title        string      `json:"title"`
			Description  string      `json:"description"`
			WorldSetting interface{} `json:"worldSetting"`
			Tags         string      `json:"tags"`
		}

		if err2 := json.Unmarshal([]byte(response), &flexResult); err2 != nil {
			logger.Error("Failed to parse JSON response", zap.Error(err2), zap.String("response", response))
			return nil, fmt.Errorf("解析 JSON 失败: %v", err2)
		}

		// 转换结果
		result.Title = flexResult.Title
		result.Description = flexResult.Description
		result.Tags = flexResult.Tags

		// 处理 worldSetting（可能是字符串或对象）
		switch v := flexResult.WorldSetting.(type) {
		case string:
			result.WorldSetting = v
		case map[string]interface{}:
			// 如果是对象，将其转换为格式化的字符串
			var parts []string
			if bg, ok := v["background"].(string); ok && bg != "" {
				parts = append(parts, "【世界背景】\n"+bg)
			}
			if ps, ok := v["powerSystem"].(string); ok && ps != "" {
				parts = append(parts, "【力量体系】\n"+ps)
			}
			if ss, ok := v["socialStructure"].(string); ok && ss != "" {
				parts = append(parts, "【社会结构】\n"+ss)
			}
			result.WorldSetting = strings.Join(parts, "\n\n")
		default:
			// 尝试将其转换为 JSON 字符串
			if jsonBytes, err := json.Marshal(v); err == nil {
				result.WorldSetting = string(jsonBytes)
			}
		}
	}

	// 使用固定字段的值
	fixedFieldsMap := make(map[string]bool)
	for _, field := range req.FixedFields {
		fixedFieldsMap[field] = true
	}

	if fixedFieldsMap["title"] {
		result.Title = req.Title
	}
	if fixedFieldsMap["description"] {
		result.Description = req.Description
	}
	if fixedFieldsMap["worldSetting"] {
		result.WorldSetting = req.WorldSetting
	}
	if fixedFieldsMap["tags"] {
		result.Tags = req.Tags
	}

	return &result, nil
}
