package llm

import (
	"context"
	"encoding/json"
	"fmt"
)

// PlotGenerateRequest 情节生成请求
type PlotGenerateRequest struct {
	Title        string `json:"title"`        // 情节标题（必填）
	NovelTitle   string `json:"novelTitle"`   // 小说标题（可选）
	NovelGenre   string `json:"novelGenre"`   // 小说类型（可选）
	WorldSetting string `json:"worldSetting"` // 世界观设定（可选）
	Characters   string `json:"characters"`   // 相关角色（可选）
	PlotType     string `json:"plotType"`     // 情节类型（主线/支线/转折等）
	Context      string `json:"context"`      // 上下文（可选）
}

// PlotGenerateResponse 情节生成响应
type PlotGenerateResponse struct {
	Title       string `json:"title"`       // 情节标题
	Content     string `json:"content"`     // 情节详细内容
	Summary     string `json:"summary"`     // 情节摘要
	Conflict    string `json:"conflict"`    // 冲突点
	Development string `json:"development"` // 发展方向
	Characters  string `json:"characters"`  // 涉及角色
	Impact      string `json:"impact"`      // 影响和后果
}

// PlotGenerator 情节生成器
type PlotGenerator struct {
	handler *LLMHandler
	model   string
}

// NewPlotGenerator 创建情节生成器
func NewPlotGenerator(apiKey, baseURL, model string) *PlotGenerator {
	systemPrompt := `你是一个专业的小说情节设计师，擅长构建引人入胜的故事情节。

你的任务是根据用户提供的信息，生成一个完整、详细的情节设定。

情节设定应该包括：
1. 情节内容：详细的情节描述，包括事件发展
2. 情节摘要：简洁的情节概括
3. 冲突点：情节中的主要矛盾和冲突
4. 发展方向：情节可能的发展走向
5. 涉及角色：参与这个情节的主要角色
6. 影响和后果：这个情节对故事的影响

请确保情节设定：
- 逻辑合理，前后连贯
- 有足够的戏剧张力
- 符合小说的整体风格
- 为后续发展留有空间

请以 JSON 格式返回结果，包含以下字段：
{
  "title": "情节标题",
  "content": "情节详细内容（300-500字）",
  "summary": "情节摘要（100-150字）",
  "conflict": "冲突点（100-150字）",
  "development": "发展方向（100-150字）",
  "characters": "涉及角色（80-100字）",
  "impact": "影响和后果（100-150字）"
}`

	handler := NewLLMHandler(context.Background(), apiKey, baseURL, systemPrompt)

	if model == "" {
		model = "gpt-3.5-turbo"
	}

	return &PlotGenerator{
		handler: handler,
		model:   model,
	}
}

// Generate 生成情节
func (g *PlotGenerator) Generate(req PlotGenerateRequest) (*PlotGenerateResponse, error) {
	// 构建提示词
	prompt := fmt.Sprintf("请为以下情节生成完整的设定：\n\n")
	prompt += fmt.Sprintf("情节标题：%s\n", req.Title)

	if req.NovelTitle != "" {
		prompt += fmt.Sprintf("所属小说：%s\n", req.NovelTitle)
	}

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("小说类型：%s\n", req.NovelGenre)
		prompt += fmt.Sprintf("\n请确保情节设定符合【%s】类型小说的特点和风格。\n", req.NovelGenre)
	}

	if req.WorldSetting != "" {
		prompt += fmt.Sprintf("\n【重要】小说世界观和背景设定：\n%s\n", req.WorldSetting)
		prompt += "\n请严格遵循上述世界观设定，确保情节的发展符合这个世界的规则。\n"
	}

	if req.PlotType != "" {
		prompt += fmt.Sprintf("情节类型：%s\n", req.PlotType)
	}

	if req.Characters != "" {
		prompt += fmt.Sprintf("相关角色：%s\n", req.Characters)
	}

	if req.Context != "" {
		prompt += fmt.Sprintf("上下文：%s\n", req.Context)
	}

	prompt += "\n请生成完整的情节设定，以纯 JSON 格式返回，不要包含任何 markdown 标记或其他文本。"

	// 调用 LLM
	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return nil, fmt.Errorf("failed to generate plot: %w", err)
	}

	// 清理响应
	cleanedResponse := CleanAIResponse(response)

	// 解析响应
	var result PlotGenerateResponse
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w (response: %s)", err, cleanedResponse)
	}

	return &result, nil
}

// GenerateStream 流式生成情节
func (g *PlotGenerator) GenerateStream(req PlotGenerateRequest, callback func(segment string, isComplete bool) error) (*PlotGenerateResponse, error) {
	// 构建提示词
	prompt := fmt.Sprintf("请为以下情节生成完整的设定：\n\n")
	prompt += fmt.Sprintf("情节标题：%s\n", req.Title)

	if req.NovelTitle != "" {
		prompt += fmt.Sprintf("所属小说：%s\n", req.NovelTitle)
	}

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("小说类型：%s\n", req.NovelGenre)
		prompt += fmt.Sprintf("\n请确保情节设定符合【%s】类型小说的特点和风格。\n", req.NovelGenre)
	}

	if req.WorldSetting != "" {
		prompt += fmt.Sprintf("\n【重要】小说世界观和背景设定：\n%s\n", req.WorldSetting)
		prompt += "\n请严格遵循上述世界观设定，确保情节的发展符合这个世界的规则。\n"
	}

	if req.PlotType != "" {
		prompt += fmt.Sprintf("情节类型：%s\n", req.PlotType)
	}

	if req.Characters != "" {
		prompt += fmt.Sprintf("相关角色：%s\n", req.Characters)
	}

	if req.Context != "" {
		prompt += fmt.Sprintf("上下文：%s\n", req.Context)
	}

	prompt += "\n请生成完整的情节设定，以纯 JSON 格式返回，不要包含任何 markdown 标记或其他文本。"

	// 调用 LLM 流式接口
	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8),
		Stream:      true,
	}

	response, err := g.handler.QueryStream(prompt, options, callback)
	if err != nil {
		return nil, fmt.Errorf("failed to generate plot: %w", err)
	}

	// 清理响应
	cleanedResponse := CleanAIResponse(response)

	// 解析响应
	var result PlotGenerateResponse
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w (response: %s)", err, cleanedResponse)
	}

	return &result, nil
}

// EnhanceContent 增强情节内容
func (g *PlotGenerator) EnhanceContent(title, currentContent string) (string, error) {
	prompt := fmt.Sprintf(`请帮我优化和扩展以下情节的内容，使其更加精彩、引人入胜：

情节标题：%s
当前内容：%s

请返回优化后的内容（300-500字），要求：
1. 保留原有的核心情节
2. 增加更多细节和戏剧张力
3. 使情节发展更加合理
4. 突出冲突和转折

只返回优化后的内容文本，不要包含其他内容。`, title, currentContent)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to enhance content: %w", err)
	}

	return response, nil
}
