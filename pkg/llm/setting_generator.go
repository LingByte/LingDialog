package llm

import (
	"context"
	"fmt"
)

// SettingGenerator 设定生成器
type SettingGenerator struct {
	handler *LLMHandler
	model   string
}

// NewSettingGenerator 创建设定生成器
func NewSettingGenerator(apiKey, baseURL, model string) *SettingGenerator {
	systemPrompt := `你是一个专业的小说世界观设计师，擅长创建详细、合理、有深度的小说设定。

你的任务是根据小说信息和用户需求，生成高质量的设定内容，包括：
1. 世界观背景：历史、地理、文化、社会结构等
2. 力量体系：修炼/魔法/异能等级、规则、限制
3. 科技设定：科技水平、关键技术、应用场景
4. 基础概念：世界观中的特殊概念、术语解释
5. 规则设定：世界运行的基本规则和限制
6. 组织势力：重要组织、势力分布、关系网络
7. 物品道具：关键物品、装备、宝物等

设计原则：
1. **逻辑自洽**：设定之间要相互协调，不能自相矛盾
2. **细节丰富**：提供具体的细节和例子，避免空洞
3. **层次分明**：从宏观到微观，结构清晰
4. **服务剧情**：设定要为故事服务，不能喧宾夺主
5. **留有余地**：保留扩展空间，不要写死
6. **易于理解**：用清晰的语言解释复杂概念

请以清晰、结构化的方式返回设定内容。`

	handler := NewLLMHandler(context.Background(), apiKey, baseURL, systemPrompt)

	if model == "" {
		model = "gpt-3.5-turbo"
	}

	return &SettingGenerator{
		handler: handler,
		model:   model,
	}
}

// Generate 生成设定内容
func (g *SettingGenerator) Generate(novelTitle, novelGenre, category, title, context, requirements string) (string, string, string, error) {
	categoryNames := map[string]string{
		"world":   "世界观背景",
		"power":   "力量体系",
		"tech":    "科技设定",
		"concept": "基础概念",
		"rule":    "规则设定",
		"org":     "组织势力",
		"item":    "物品道具",
		"other":   "其他设定",
	}

	categoryName := categoryNames[category]
	if categoryName == "" {
		categoryName = "设定"
	}

	prompt := fmt.Sprintf("请为以下小说生成【%s】设定：\n\n", categoryName)
	prompt += fmt.Sprintf("【小说信息】\n")
	prompt += fmt.Sprintf("标题：%s\n", novelTitle)

	if novelGenre != "" {
		prompt += fmt.Sprintf("类型：%s\n", novelGenre)
	}

	if title != "" {
		prompt += fmt.Sprintf("\n【设定标题】\n%s\n", title)
	}

	if context != "" {
		prompt += fmt.Sprintf("\n【背景信息】\n%s\n", context)
	}

	if requirements != "" {
		prompt += fmt.Sprintf("\n【具体要求】\n%s\n", requirements)
	}

	prompt += fmt.Sprintf("\n【生成要求】\n")

	switch category {
	case "world":
		prompt += `请生成世界观背景设定，包括：
1. 世界的基本构成（地理、历史、文化）
2. 社会结构和政治体系
3. 重要的历史事件和时间线
4. 文化特色和风俗习惯
5. 与故事相关的关键背景信息`

	case "power":
		prompt += `请生成力量体系设定，包括：
1. 力量的来源和本质
2. 等级划分和晋升条件
3. 修炼/使用方法和规则
4. 力量的限制和代价
5. 不同等级的具体表现和能力`

	case "tech":
		prompt += `请生成科技设定，包括：
1. 科技发展水平和时代背景
2. 关键技术和原理
3. 技术的应用场景和影响
4. 技术的限制和副作用
5. 与故事相关的科技元素`

	case "concept":
		prompt += `请生成基础概念设定，包括：
1. 概念的定义和含义
2. 概念的起源和发展
3. 概念在世界中的作用
4. 相关的术语和解释
5. 具体的例子和应用`

	case "rule":
		prompt += `请生成规则设定，包括：
1. 规则的内容和范围
2. 规则的来源和依据
3. 遵守规则的好处
4. 违反规则的后果
5. 规则的例外情况`

	case "org":
		prompt += `请生成组织势力设定，包括：
1. 组织的名称和性质
2. 组织的历史和发展
3. 组织结构和成员
4. 组织的目标和理念
5. 与其他势力的关系`

	case "item":
		prompt += `请生成物品道具设定，包括：
1. 物品的名称和外观
2. 物品的来历和制作
3. 物品的功能和效果
4. 使用条件和限制
5. 物品的稀有度和价值`

	default:
		prompt += `请生成详细的设定内容，包括：
1. 设定的核心内容
2. 相关的背景信息
3. 具体的细节和例子
4. 与故事的关联
5. 可能的扩展方向`
	}

	prompt += `

请以清晰、结构化的方式返回设定内容。内容要详细具体，避免空洞的概括。

如果用户没有提供标题，请根据内容生成一个合适的标题。

返回格式：
标题：[设定标题]
---
[详细的设定内容，使用标题、列表、段落等组织]
---
标签：[相关标签，逗号分隔]`

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
		MaxTokens:   IntPtr(3000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to generate setting: %w", err)
	}

	// 解析响应
	cleanedResponse := CleanAIResponse(response)

	// 简单解析标题、内容和标签
	generatedTitle := title
	content := cleanedResponse
	tags := ""

	// 尝试提取标题
	if title == "" {
		// 查找 "标题：" 后的内容
		if idx := findPattern(cleanedResponse, "标题："); idx >= 0 {
			endIdx := findLineEnd(cleanedResponse, idx)
			if endIdx > idx {
				generatedTitle = cleanedResponse[idx:endIdx]
			}
		}
	}

	// 提取主要内容（在 --- 之间）
	if startIdx := findPattern(cleanedResponse, "---"); startIdx >= 0 {
		startIdx += 3
		if endIdx := findPattern(cleanedResponse[startIdx:], "---"); endIdx >= 0 {
			content = cleanedResponse[startIdx : startIdx+endIdx]
		}
	}

	// 提取标签
	if idx := findPattern(cleanedResponse, "标签："); idx >= 0 {
		endIdx := findLineEnd(cleanedResponse, idx)
		if endIdx > idx {
			tags = cleanedResponse[idx:endIdx]
		}
	}

	return generatedTitle, content, tags, nil
}

// EnhanceSetting 完善设定内容
func (g *SettingGenerator) EnhanceSetting(title, currentContent, enhanceHint string) (string, error) {
	hintText := ""
	if enhanceHint != "" {
		hintText = fmt.Sprintf("\n\n【完善要求】\n%s", enhanceHint)
	}

	prompt := fmt.Sprintf(`请完善以下设定内容：

【设定标题】
%s

【当前内容】
%s%s

请对设定内容进行完善和扩充，要求：
1. 增加更多具体的细节和例子
2. 补充相关的背景信息
3. 使内容更加丰富和立体
4. 保持逻辑自洽和结构清晰
5. 内容应该是原内容的 2-3 倍

直接返回完善后的内容，不要添加任何额外的说明或标记。`, title, currentContent, hintText)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
		MaxTokens:   IntPtr(3000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to enhance setting: %w", err)
	}

	return CleanAIResponse(response), nil
}

// 辅助函数：查找模式
func findPattern(text, pattern string) int {
	for i := 0; i <= len(text)-len(pattern); i++ {
		if text[i:i+len(pattern)] == pattern {
			return i + len(pattern)
		}
	}
	return -1
}

// 辅助函数：查找行尾
func findLineEnd(text string, start int) int {
	for i := start; i < len(text); i++ {
		if text[i] == '\n' || text[i] == '\r' {
			return i
		}
	}
	return len(text)
}
