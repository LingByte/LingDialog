package llm

import (
	"context"
	"encoding/json"
	"fmt"
)

// CharacterGenerateRequest 角色生成请求
type CharacterGenerateRequest struct {
	Name        string `json:"name"`        // 角色名称（必填）
	NovelTitle  string `json:"novelTitle"`  // 小说标题（可选，用于上下文）
	NovelGenre  string `json:"novelGenre"`  // 小说类型（可选）
	Role        string `json:"role"`        // 角色定位（主角/配角/反派等）
	Personality string `json:"personality"` // 性格特点（可选）
	Background  string `json:"background"`  // 背景设定（可选）
}

// CharacterGenerateResponse 角色生成响应
type CharacterGenerateResponse struct {
	Name        string `json:"name"`        // 角色名称
	Description string `json:"description"` // 完整的角色描述
	Personality string `json:"personality"` // 性格特点
	Background  string `json:"background"`  // 背景故事
	Appearance  string `json:"appearance"`  // 外貌描述
	Skills      string `json:"skills"`      // 技能特长
	Goals       string `json:"goals"`       // 目标动机
	Weaknesses  string `json:"weaknesses"`  // 弱点缺陷
}

// CharacterGenerator 角色生成器
type CharacterGenerator struct {
	handler *LLMHandler
	model   string
}

// NewCharacterGenerator 创建角色生成器
func NewCharacterGenerator(apiKey, baseURL, model string) *CharacterGenerator {
	systemPrompt := `你是一个专业的小说角色设计师，擅长创造有深度、立体的角色。

你的任务是根据用户提供的基本信息，生成一个完整、详细的角色设定。

角色设定应该包括：
1. 性格特点：多维度的性格描述，包括优点和缺点
2. 背景故事：角色的成长经历、重要事件
3. 外貌描述：具体的外貌特征，符合角色性格
4. 技能特长：角色擅长的领域或能力
5. 目标动机：角色的追求和内心驱动力
6. 弱点缺陷：角色的局限性和成长空间

请确保角色设定：
- 真实可信，有血有肉
- 性格复杂，不是单一标签
- 有成长空间和故事潜力
- 符合小说的整体风格和背景

请以 JSON 格式返回结果，包含以下字段：
{
  "name": "角色名称",
  "description": "角色的完整描述（200-300字）",
  "personality": "性格特点（100-150字）",
  "background": "背景故事（150-200字）",
  "appearance": "外貌描述（80-100字）",
  "skills": "技能特长（80-100字）",
  "goals": "目标动机（80-100字）",
  "weaknesses": "弱点缺陷（80-100字）"
}`

	handler := NewLLMHandler(context.Background(), apiKey, baseURL, systemPrompt)

	// 如果没有指定模型，使用默认值
	if model == "" {
		model = "gpt-3.5-turbo"
	}

	return &CharacterGenerator{
		handler: handler,
		model:   model,
	}
}

// Generate 生成角色
func (g *CharacterGenerator) Generate(req CharacterGenerateRequest) (*CharacterGenerateResponse, error) {
	// 构建提示词
	prompt := fmt.Sprintf("请为以下角色生成完整的设定：\n\n")
	prompt += fmt.Sprintf("角色名称：%s\n", req.Name)

	if req.NovelTitle != "" {
		prompt += fmt.Sprintf("所属小说：%s\n", req.NovelTitle)
	}

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("小说类型：%s\n", req.NovelGenre)
		prompt += fmt.Sprintf("\n请确保角色设定符合【%s】类型小说的特点和风格。\n", req.NovelGenre)
	}

	if req.Role != "" {
		prompt += fmt.Sprintf("角色定位：%s\n", req.Role)
	}

	if req.Personality != "" {
		prompt += fmt.Sprintf("性格参考：%s\n", req.Personality)
	}

	if req.Background != "" {
		prompt += fmt.Sprintf("\n【重要】小说世界观和背景设定：\n%s\n", req.Background)
		prompt += "\n请严格遵循上述世界观设定，确保角色的背景、能力、经历都符合这个世界的规则和设定。\n"
	}

	prompt += "\n请生成完整的角色设定，以纯 JSON 格式返回，不要包含任何 markdown 标记或其他文本。"

	// 调用 LLM
	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8), // 较高的温度以获得更有创意的结果
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return nil, fmt.Errorf("failed to generate character: %w", err)
	}

	// 清理响应，移除可能的 markdown 代码块标记
	cleanedResponse := CleanAIResponse(response)

	// 解析响应
	var result CharacterGenerateResponse
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w (response: %s)", err, cleanedResponse)
	}

	return &result, nil
}

// GenerateStream 流式生成角色（用于实时显示生成过程）
func (g *CharacterGenerator) GenerateStream(req CharacterGenerateRequest, callback func(segment string, isComplete bool) error) (*CharacterGenerateResponse, error) {
	// 构建提示词
	prompt := fmt.Sprintf("请为以下角色生成完整的设定：\n\n")
	prompt += fmt.Sprintf("角色名称：%s\n", req.Name)

	if req.NovelTitle != "" {
		prompt += fmt.Sprintf("所属小说：%s\n", req.NovelTitle)
	}

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("小说类型：%s\n", req.NovelGenre)
		prompt += fmt.Sprintf("\n请确保角色设定符合【%s】类型小说的特点和风格。\n", req.NovelGenre)
	}

	if req.Role != "" {
		prompt += fmt.Sprintf("角色定位：%s\n", req.Role)
	}

	if req.Personality != "" {
		prompt += fmt.Sprintf("性格参考：%s\n", req.Personality)
	}

	if req.Background != "" {
		prompt += fmt.Sprintf("\n【重要】小说世界观和背景设定：\n%s\n", req.Background)
		prompt += "\n请严格遵循上述世界观设定，确保角色的背景、能力、经历都符合这个世界的规则和设定。\n"
	}

	prompt += "\n请生成完整的角色设定，以纯 JSON 格式返回，不要包含任何 markdown 标记或其他文本。"

	// 调用 LLM 流式接口
	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.8),
		Stream:      true,
	}

	response, err := g.handler.QueryStream(prompt, options, callback)
	if err != nil {
		return nil, fmt.Errorf("failed to generate character: %w", err)
	}

	// 清理响应，移除可能的 markdown 代码块标记
	cleanedResponse := CleanAIResponse(response)

	// 解析响应
	var result CharacterGenerateResponse
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w (response: %s)", err, cleanedResponse)
	}

	return &result, nil
}

// EnhanceDescription 增强角色描述
func (g *CharacterGenerator) EnhanceDescription(name, currentDescription string) (string, error) {
	prompt := fmt.Sprintf(`请帮我优化和扩展以下角色的描述，使其更加生动、立体和有深度：

角色名称：%s
当前描述：%s

请返回优化后的描述（200-300字），要求：
1. 保留原有的核心特点
2. 增加更多细节和深度
3. 使描述更加生动形象
4. 突出角色的独特性

只返回优化后的描述文本，不要包含其他内容。`, name, currentDescription)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to enhance description: %w", err)
	}

	return response, nil
}

// SuggestRelationships 建议角色关系
func (g *CharacterGenerator) SuggestRelationships(character1, character2 string, desc1, desc2 string) (string, error) {
	prompt := fmt.Sprintf(`基于以下两个角色的设定，请建议他们之间可能的关系和互动方式：

角色1：%s
描述：%s

角色2：%s
描述：%s

请分析：
1. 他们可能的关系类型（朋友、敌人、师徒、恋人等）
2. 互动的可能性和冲突点
3. 关系发展的潜在方向

返回简洁的分析（150-200字）。`, character1, desc1, character2, desc2)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to suggest relationships: %w", err)
	}

	return response, nil
}
