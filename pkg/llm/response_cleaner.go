package llm

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

// CleanAIResponse 清理 AI 返回的响应，移除可能导致 JSON 解析失败的字符
func CleanAIResponse(response string) string {
	// 0. 确保字符串是有效的 UTF-8
	if !utf8.ValidString(response) {
		// 移除无效的 UTF-8 字符
		v := make([]rune, 0, len(response))
		for i, r := range response {
			if r == utf8.RuneError {
				_, size := utf8.DecodeRuneInString(response[i:])
				if size == 1 {
					continue // 跳过无效字符
				}
			}
			v = append(v, r)
		}
		response = string(v)
	}

	// 1. 移除 markdown 代码块标记
	response = strings.TrimPrefix(response, "```json")
	response = strings.TrimPrefix(response, "```")
	response = strings.TrimSuffix(response, "```")
	response = strings.TrimSpace(response)

	// 2. 替换中文引号为英文引号
	response = strings.ReplaceAll(response, "\u201c", "\"") // "
	response = strings.ReplaceAll(response, "\u201d", "\"") // "
	response = strings.ReplaceAll(response, "\u2018", "'")  // '
	response = strings.ReplaceAll(response, "\u2019", "'")  // '

	// 3. 替换全角字符为半角
	response = strings.ReplaceAll(response, "\uff1a", ":") // ：
	response = strings.ReplaceAll(response, "\uff0c", ",") // ，
	response = strings.ReplaceAll(response, "\uff5b", "{") // ｛
	response = strings.ReplaceAll(response, "\uff5d", "}") // ｝
	response = strings.ReplaceAll(response, "\uff3b", "[") // ［
	response = strings.ReplaceAll(response, "\uff3d", "]") // ］

	// 4. 移除 BOM (Byte Order Mark) 和零宽字符
	response = strings.TrimPrefix(response, "\ufeff")
	response = strings.ReplaceAll(response, "\u200b", "") // 零宽空格
	response = strings.ReplaceAll(response, "\u200c", "") // 零宽非连接符
	response = strings.ReplaceAll(response, "\u200d", "") // 零宽连接符
	response = strings.ReplaceAll(response, "\ufeff", "") // BOM

	// 5. 移除控制字符（保留换行、回车和制表符）
	re := regexp.MustCompile(`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`)
	response = re.ReplaceAllString(response, "")

	// 6. 查找并提取 JSON 对象
	start := strings.Index(response, "{")
	end := strings.LastIndex(response, "}")
	if start >= 0 && end > start {
		response = response[start : end+1]
	}

	// 7. 修复常见的 JSON 格式问题
	// 移除尾随逗号
	re = regexp.MustCompile(`,(\s*[}\]])`)
	response = re.ReplaceAllString(response, "$1")

	return response
}

// ExtractJSON 从文本中提取 JSON 内容
func ExtractJSON(text string) string {
	// 查找第一个 { 和最后一个 }
	start := strings.Index(text, "{")
	end := strings.LastIndex(text, "}")

	if start >= 0 && end > start {
		return text[start : end+1]
	}

	return text
}

// ValidateAndCleanJSON 验证并清理 JSON 字符串
func ValidateAndCleanJSON(jsonStr string) string {
	// 先清理
	cleaned := CleanAIResponse(jsonStr)

	// 提取 JSON
	extracted := ExtractJSON(cleaned)

	return extracted
}
