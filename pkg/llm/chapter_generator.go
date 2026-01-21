package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// ChapterGenerateRequest 章节生成请求
type ChapterGenerateRequest struct {
	Title           string   `json:"title"`           // 章节标题
	NovelTitle      string   `json:"novelTitle"`      // 小说标题
	NovelGenre      string   `json:"novelGenre"`      // 小说类型
	WorldSetting    string   `json:"worldSetting"`    // 世界观设定
	StyleGuide      string   `json:"styleGuide"`      // 风格指南
	Outline         string   `json:"outline"`         // 章节大纲
	Characters      []string `json:"characters"`      // 参与角色描述
	PlotPoints      []string `json:"plotPoints"`      // 涉及情节
	PreviousSummary string   `json:"previousSummary"` // 前文摘要
	ChapterNumber   int      `json:"chapterNumber"`   // 章节序号
	TargetWordCount int      `json:"targetWordCount"` // 目标字数
	WritingStyle    string   `json:"writingStyle"`    // 写作风格
	FocusPoints     []string `json:"focusPoints"`     // 本章重点
	AvoidComplete   bool     `json:"avoidComplete"`   // 避免完结情节
}

// ChapterSuggestionsRequest 章节建议请求
type ChapterSuggestionsRequest struct {
	NovelTitle      string `json:"novelTitle"`      // 小说标题
	NovelGenre      string `json:"novelGenre"`      // 小说类型
	WorldSetting    string `json:"worldSetting"`    // 世界观设定
	PreviousSummary string `json:"previousSummary"` // 前文摘要
	ChapterNumber   int    `json:"chapterNumber"`   // 章节序号
}

// ChapterSuggestion 章节建议
type ChapterSuggestion struct {
	Title       string `json:"title"`       // 建议标题
	Outline     string `json:"outline"`     // 建议大纲
	Description string `json:"description"` // 发展方向描述
	Type        string `json:"type"`        // 类型：action/emotion/plot/mystery等
}

// ChapterGenerateResponse 章节生成响应
type ChapterGenerateResponse struct {
	Title           string   `json:"title"`           // 章节标题
	Content         string   `json:"content"`         // 章节内容
	Summary         string   `json:"summary"`         // 章节摘要
	KeyEvents       []string `json:"keyEvents"`       // 关键事件
	CharacterDev    string   `json:"characterDev"`    // 角色发展
	PlotProgress    string   `json:"plotProgress"`    // 情节推进
	Foreshadowing   string   `json:"foreshadowing"`   // 伏笔设置
	NextChapterHint string   `json:"nextChapterHint"` // 下章提示
}

// ChapterGenerator 章节生成器
type ChapterGenerator struct {
	handler *LLMHandler
	model   string
}

// NewChapterGenerator 创建章节生成器
func NewChapterGenerator(apiKey, baseURL, model string) *ChapterGenerator {
	systemPrompt := `你是一个专业的网络小说作家，擅长创作引人入胜的章节内容。

你的任务是根据提供的信息，生成一个完整的章节。

重要原则：
1. **字数控制**：严格按照目标字数要求，不要超出太多（误差控制在200字以内）
2. **渐进式叙事**：不要一次性讲完所有内容，要为后续章节留有发展空间
3. **伏笔设置**：适当埋下伏笔，增加悬念
4. **节奏控制**：注意情节推进的节奏，不要过快或过慢
5. **角色塑造**：通过对话和行动展现角色性格，而非直接描述
6. **细节描写**：适当的环境和动作描写，增强代入感
7. **避免完结**：除非明确要求，否则不要在本章完结某个情节线

写作要求：
- 使用第三人称叙述
- 对话要符合角色性格
- 场景转换要自然
- 保持悬念和吸引力
- 严格控制字数在目标范围内

请以 JSON 格式返回结果，包含以下字段：
{
  "title": "章节标题",
  "content": "章节完整内容",
  "summary": "章节摘要（200字以内）",
  "keyEvents": ["关键事件1", "关键事件2"],
  "characterDev": "角色发展说明",
  "plotProgress": "情节推进说明",
  "foreshadowing": "伏笔设置说明",
  "nextChapterHint": "下章发展提示"
}`

	handler := NewLLMHandler(context.Background(), apiKey, baseURL, systemPrompt)

	if model == "" {
		model = "gpt-3.5-turbo"
	}

	return &ChapterGenerator{
		handler: handler,
		model:   model,
	}
}

// Generate 生成章节
func (g *ChapterGenerator) Generate(req ChapterGenerateRequest) (*ChapterGenerateResponse, error) {
	// 构建提示词
	prompt := fmt.Sprintf("请生成以下章节的内容：\n\n")
	prompt += fmt.Sprintf("【基本信息】\n")
	prompt += fmt.Sprintf("小说：%s\n", req.NovelTitle)
	prompt += fmt.Sprintf("章节：第 %d 章 - %s\n", req.ChapterNumber, req.Title)

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("类型：%s\n", req.NovelGenre)
	}

	if req.TargetWordCount > 0 {
		prompt += fmt.Sprintf("目标字数：严格控制在 %d 字左右（误差不超过200字）\n", req.TargetWordCount)
	} else {
		prompt += "目标字数：严格控制在 2000 字左右（误差不超过200字）\n"
	}

	if req.WorldSetting != "" {
		prompt += fmt.Sprintf("\n【世界观设定】\n%s\n", req.WorldSetting)
		prompt += "\n⚠️ 重要：请严格遵循世界观设定，不要让角色的能力或境界超出合理范围。\n"
	}

	if req.StyleGuide != "" {
		prompt += fmt.Sprintf("\n【写作风格指南】\n%s\n", req.StyleGuide)
		prompt += "\n⚠️ 请参考以上风格指南，模仿其写作风格、对话方式和描写技巧。\n"
	}

	if req.PreviousSummary != "" {
		prompt += fmt.Sprintf("\n【前文回顾】\n%s\n", req.PreviousSummary)
		prompt += "\n⚠️ 重要：请确保本章内容与前文情节连贯，角色行为符合之前的发展轨迹。\n"
	}

	if req.Outline != "" {
		prompt += fmt.Sprintf("\n【本章大纲】\n%s\n", req.Outline)
	}

	if len(req.Characters) > 0 {
		prompt += fmt.Sprintf("\n【参与角色】\n")
		for i, char := range req.Characters {
			prompt += fmt.Sprintf("%d. %s\n", i+1, char)
		}
	}

	if len(req.PlotPoints) > 0 {
		prompt += fmt.Sprintf("\n【涉及情节】\n")
		for i, plot := range req.PlotPoints {
			prompt += fmt.Sprintf("%d. %s\n", i+1, plot)
		}
		if req.AvoidComplete {
			prompt += "\n⚠️ 注意：本章只需推进情节，不要完结任何情节线，要为后续发展留有空间。\n"
		}
	}

	if len(req.FocusPoints) > 0 {
		prompt += fmt.Sprintf("\n【本章重点】\n")
		for i, point := range req.FocusPoints {
			prompt += fmt.Sprintf("%d. %s\n", i+1, point)
		}
	}

	if req.WritingStyle != "" {
		prompt += fmt.Sprintf("\n【写作风格】\n%s\n", req.WritingStyle)
	}

	prompt += `

【重要要求】
1. 严格控制字数：内容必须控制在目标字数范围内，不要超出太多
2. 情节完整：确保本章有完整的起承转合
3. 节奏适中：不要过快推进情节，要有适当的描写和对话
4. 保持悬念：章节结尾要有引人入胜的悬念或转折

请生成完整的章节内容，以纯 JSON 格式返回，不要包含任何 markdown 标记或其他文本。`

	// 调用 LLM
	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8),
		MaxTokens:   IntPtr(3000), // 减少 token 限制以控制字数
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return nil, fmt.Errorf("failed to generate chapter: %w", err)
	}

	// 清理响应
	cleanedResponse := CleanAIResponse(response)

	// 解析响应
	var result ChapterGenerateResponse
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w (response: %s)", err, cleanedResponse)
	}

	return &result, nil
}

// GenerateSummary 生成章节摘要（用于上下文压缩）
func (g *ChapterGenerator) GenerateSummary(chapterTitle, chapterContent string) (string, error) {
	prompt := fmt.Sprintf(`请为以下章节生成一个简洁的摘要，用于后续章节的上下文参考。

章节标题：%s
章节内容：
%s

摘要要求：
1. 200字以内
2. 包含关键情节发展
3. 包含重要角色动作
4. 包含伏笔和悬念
5. 不要包含过多细节描写

只返回摘要文本，不要包含其他内容。`, chapterTitle, chapterContent)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.5), // 较低温度以保持准确性
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to generate summary: %w", err)
	}

	return response, nil
}

// GenerateSuggestions 生成章节建议
func (g *ChapterGenerator) GenerateSuggestions(req ChapterSuggestionsRequest) ([]ChapterSuggestion, error) {
	// 构建提示词
	prompt := fmt.Sprintf("请为以下小说生成5个不同的后续章节建议：\n\n")
	prompt += fmt.Sprintf("【小说信息】\n")
	prompt += fmt.Sprintf("小说：%s\n", req.NovelTitle)
	prompt += fmt.Sprintf("下一章：第 %d 章\n", req.ChapterNumber)

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("类型：%s\n", req.NovelGenre)
	}

	if req.WorldSetting != "" {
		prompt += fmt.Sprintf("\n【世界观设定】\n%s\n", req.WorldSetting)
	}

	if req.PreviousSummary != "" {
		prompt += fmt.Sprintf("\n【前文回顾】\n%s\n", req.PreviousSummary)
	}

	prompt += `

请生成5个不同发展方向的章节建议。

要求：
- 每个建议都要有不同的发展方向和重点
- 标题要有悬念和吸引力  
- 大纲要具体但不过于详细
- 确保与前文情节连贯

请严格按照以下 JSON 格式返回：

{
  "suggestions": [
    {
      "title": "章节标题",
      "outline": "场景1：描述内容。场景2：描述内容。场景3：描述内容。",
      "description": "发展方向特点说明",
      "type": "action"
    }
  ]
}

重要格式要求：
1. 只返回纯 JSON，不要任何其他文字
2. outline 字段必须是单行文本，用句号分隔场景
3. 所有字符串值都必须在一行内，不能包含换行符
4. 使用标准双引号，不要使用特殊引号
5. 确保 JSON 格式完全正确，可以被标准解析器解析

示例格式：
"outline": "场景1：主角发现线索。场景2：遭遇阻碍。场景3：找到突破口。"`

	// 调用 LLM
	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8), // 保持较高温度以增加创意
		MaxTokens:   IntPtr(2000),    // 减少 token 以控制输出长度
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return nil, fmt.Errorf("failed to generate suggestions: %w", err)
	}

	// 添加调试信息
	fmt.Printf("DEBUG: Original response length: %d\n", len(response))
	fmt.Printf("DEBUG: Original response preview: %s\n", func() string {
		if len(response) > 100 {
			return response[:100] + "..."
		}
		return response
	}())

	// 直接清理响应，不依赖 CleanAIResponse
	cleanedResponse := response

	// 1. 移除 BOM 字符
	cleanedResponse = strings.TrimPrefix(cleanedResponse, "\ufeff")

	// 2. 替换特殊引号
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\u201c", "\"") // 左双引号
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\u201d", "\"") // 右双引号
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "'", "\"")

	// 3. 关键：处理所有可能的转义和换行符问题
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\\\\n", " ") // 双重转义的换行符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\\\\r", " ") // 双重转义的回车符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\\\\t", " ") // 双重转义的制表符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\\n", " ")   // 转义的换行符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\\r", " ")   // 转义的回车符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\\t", " ")   // 转义的制表符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\n", " ")    // 实际换行符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\r", " ")    // 实际回车符
	cleanedResponse = strings.ReplaceAll(cleanedResponse, "\t", " ")    // 实际制表符

	// 4. 移除其他控制字符和不可见字符
	var builder strings.Builder
	for _, r := range cleanedResponse {
		if r >= 32 && r != 127 { // 保留可打印字符
			builder.WriteRune(r)
		} else {
			builder.WriteRune(' ') // 替换为空格
		}
	}
	cleanedResponse = builder.String()

	// 5. 清理多余的空格
	cleanedResponse = strings.Join(strings.Fields(cleanedResponse), " ")

	// 6. 确保 JSON 结构完整
	cleanedResponse = strings.TrimSpace(cleanedResponse)
	if !strings.HasPrefix(cleanedResponse, "{") {
		start := strings.Index(cleanedResponse, "{")
		if start > 0 {
			cleanedResponse = cleanedResponse[start:]
		}
	}
	if !strings.HasSuffix(cleanedResponse, "}") {
		end := strings.LastIndex(cleanedResponse, "}")
		if end > 0 {
			cleanedResponse = cleanedResponse[:end+1]
		}
	}

	// 7. 使用正则表达式进一步清理
	// 移除字符串值中的换行符和控制字符
	re := regexp.MustCompile(`"([^"]*)"`)
	cleanedResponse = re.ReplaceAllStringFunc(cleanedResponse, func(match string) string {
		// 保留引号，清理内容
		content := match[1 : len(match)-1] // 去掉引号
		content = strings.ReplaceAll(content, "\\n", " ")
		content = strings.ReplaceAll(content, "\\r", " ")
		content = strings.ReplaceAll(content, "\\t", " ")
		content = strings.ReplaceAll(content, "\n", " ")
		content = strings.ReplaceAll(content, "\r", " ")
		content = strings.ReplaceAll(content, "\t", " ")
		// 清理多余空格
		content = strings.Join(strings.Fields(content), " ")
		return "\"" + content + "\""
	})

	// 添加调试信息
	fmt.Printf("DEBUG: Cleaned response length: %d\n", len(cleanedResponse))
	fmt.Printf("DEBUG: Cleaned response preview: %s\n", func() string {
		if len(cleanedResponse) > 200 {
			return cleanedResponse[:200] + "..."
		}
		return cleanedResponse
	}())

	// 解析响应
	var result struct {
		Suggestions []ChapterSuggestion `json:"suggestions"`
	}

	// 尝试直接解析清理后的响应
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		// 如果还是失败，尝试提取 JSON 部分
		start := strings.Index(cleanedResponse, "{")
		end := strings.LastIndex(cleanedResponse, "}")
		if start >= 0 && end > start {
			jsonPart := cleanedResponse[start : end+1]
			if err2 := json.Unmarshal([]byte(jsonPart), &result); err2 == nil {
				return result.Suggestions, nil
			}
		}

		return nil, fmt.Errorf("failed to parse suggestions response: %w (cleaned response: %s)", err, func() string {
			if len(cleanedResponse) > 300 {
				return cleanedResponse[:300] + "..."
			}
			return cleanedResponse
		}())
	}

	return result.Suggestions, nil
}

// fixJSONFormat 修复 JSON 格式问题
func fixJSONFormat(jsonStr string) string {
	// 使用正则表达式或简单的字符串处理来修复 JSON 中的换行符问题

	// 首先尝试简单的修复：将字符串值中的实际换行符替换为空格
	var result strings.Builder
	inString := false
	escapeNext := false

	for _, r := range jsonStr {
		if escapeNext {
			result.WriteRune(r)
			escapeNext = false
			continue
		}

		if r == '\\' {
			result.WriteRune(r)
			escapeNext = true
			continue
		}

		if r == '"' && !escapeNext {
			inString = !inString
			result.WriteRune(r)
			continue
		}

		if inString {
			// 在字符串内部，将换行符替换为空格
			if r == '\n' || r == '\r' {
				result.WriteRune(' ')
			} else if r == '\t' {
				result.WriteRune(' ')
			} else {
				result.WriteRune(r)
			}
		} else {
			// 在字符串外部，保持原样
			result.WriteRune(r)
		}
	}

	return result.String()
}

// GenerateOutline 生成章节大纲
func (g *ChapterGenerator) GenerateOutline(req ChapterGenerateRequest) (string, error) {
	prompt := fmt.Sprintf(`请为以下章节生成一个详细的大纲：

小说：%s（类型：%s）
章节：第 %d 章 - %s

`, req.NovelTitle, req.NovelGenre, req.ChapterNumber, req.Title)

	if req.PreviousSummary != "" {
		prompt += fmt.Sprintf("前文回顾：\n%s\n\n", req.PreviousSummary)
	}

	if len(req.PlotPoints) > 0 {
		prompt += "涉及情节：\n"
		for i, plot := range req.PlotPoints {
			prompt += fmt.Sprintf("%d. %s\n", i+1, plot)
		}
		prompt += "\n"
	}

	prompt += `请生成本章的详细大纲，包括：
1. 开场（如何承接上文）
2. 主要情节发展（分3-5个场景）
3. 角色互动和对话要点
4. 冲突和转折点
5. 结尾（如何引出下章）

大纲要具体但不要过于详细，为实际写作留有发挥空间。`

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to generate outline: %w", err)
	}

	return response, nil
}

// RefineContent 根据反馈优化章节内容
func (g *ChapterGenerator) RefineContent(chapterTitle, originalContent, feedback string) (string, error) {
	prompt := fmt.Sprintf(`请根据以下反馈优化章节内容：

章节标题：%s

原始内容：
%s

反馈意见：
%s

请根据反馈意见修改内容，保持原有的情节框架，但改进具体的表达、节奏或细节。

重要要求：
1. 只返回优化后的完整章节内容
2. 不要返回 JSON 格式
3. 不要包含任何说明文字
4. 不要包含标题
5. 直接返回章节正文内容

开始优化：`, chapterTitle, originalContent, feedback)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
		MaxTokens:   IntPtr(6000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to refine content: %w", err)
	}

	// 清理可能的 JSON 格式响应
	cleanedResponse := CleanAIResponse(response)

	// 如果响应看起来像 JSON，尝试提取 content 字段
	if strings.HasPrefix(strings.TrimSpace(cleanedResponse), "{") {
		var jsonResp map[string]interface{}
		if err := json.Unmarshal([]byte(cleanedResponse), &jsonResp); err == nil {
			if content, ok := jsonResp["content"].(string); ok {
				return content, nil
			}
		}
	}

	return cleanedResponse, nil
}

// ContinueChapter 续写章节（当内容不够时）
func (g *ChapterGenerator) ContinueChapter(chapterTitle, existingContent, continueHint string) (string, error) {
	prompt := fmt.Sprintf(`请续写以下章节：

章节标题：%s

已有内容：
%s

续写提示：%s

请自然地续写内容，保持风格一致，推进情节发展。
只返回续写的内容部分，不要重复已有内容。`, chapterTitle, existingContent, continueHint)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8),
		MaxTokens:   IntPtr(2000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to continue chapter: %w", err)
	}

	return response, nil
}

// ExpandContentRequest 扩写内容请求
type ExpandContentRequest struct {
	OriginalContent string `json:"originalContent"` // 原始内容
	ExpandTarget    string `json:"expandTarget"`    // 要扩写的段落
	ExpandHint      string `json:"expandHint"`      // 扩写提示
	NovelGenre      string `json:"novelGenre"`      // 小说类型
	WorldSetting    string `json:"worldSetting"`    // 世界观
	StyleGuide      string `json:"styleGuide"`      // 风格指南
}

// ExpandContent 扩写内容（分段扩写）
func (g *ChapterGenerator) ExpandContent(req ExpandContentRequest) (string, error) {
	prompt := fmt.Sprintf(`请对以下段落进行扩写，增加细节描写和情节发展。

【原始段落】
%s

【扩写要求】
%s

【写作要求】
1. 保持原有情节和人物设定
2. 增加环境描写、心理描写、动作细节
3. 扩写后字数应为原文的 2-3 倍
4. 保持叙事节奏流畅自然
5. 不要改变原有的情节走向

`, req.ExpandTarget, req.ExpandHint)

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("小说类型：%s\n", req.NovelGenre)
	}

	if req.WorldSetting != "" {
		prompt += fmt.Sprintf("\n【世界观设定】\n%s\n", req.WorldSetting)
	}

	if req.StyleGuide != "" {
		prompt += fmt.Sprintf("\n【写作风格】\n%s\n", req.StyleGuide)
	}

	prompt += "\n请直接返回扩写后的内容，不要包含任何说明文字。"

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8),
		MaxTokens:   IntPtr(3000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to expand content: %w", err)
	}

	return response, nil
}
