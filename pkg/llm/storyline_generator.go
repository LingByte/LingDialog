package llm

import (
	"context"
	"encoding/json"
	"fmt"
)

// StorylineGenerateRequest 故事线生成请求
type StorylineGenerateRequest struct {
	NovelTitle         string              `json:"novelTitle"`
	NovelGenre         string              `json:"novelGenre"`
	WorldSetting       string              `json:"worldSetting"`
	Characters         []string            `json:"characters"`         // 主要角色描述
	MainConflict       string              `json:"mainConflict"`       // 核心冲突
	StorylineCount     int                 `json:"storylineCount"`     // 生成故事线数量
	NodesPerLine       int                 `json:"nodesPerLine"`       // 每条故事线的节点数
	ExistingStorylines []ExistingStoryline `json:"existingStorylines"` // 已有故事线
}

// ExistingStoryline 已有故事线信息
type ExistingStoryline struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

// StorylineGenerateResponse 故事线生成响应
type StorylineGenerateResponse struct {
	Storylines []GeneratedStoryline `json:"storylines"`
}

// GeneratedStoryline 生成的故事线
type GeneratedStoryline struct {
	Title       string                `json:"title"`
	Description string                `json:"description"`
	Type        string                `json:"type"`     // main, character, plot, theme
	Color       string                `json:"color"`    // 十六进制颜色
	Priority    int                   `json:"priority"` // 优先级
	Nodes       []GeneratedNode       `json:"nodes"`
	Connections []GeneratedConnection `json:"connections"`
}

// GeneratedNode 生成的故事节点
type GeneratedNode struct {
	Title        string `json:"title"`
	Description  string `json:"description"`
	NodeType     string `json:"nodeType"`     // start, event, turning, merge, end
	ChapterRange string `json:"chapterRange"` // 涉及章节范围
	OrderIndex   int    `json:"orderIndex"`   // 顺序索引
	Status       string `json:"status"`       // planned, writing, completed
}

// GeneratedConnection 生成的节点连接
type GeneratedConnection struct {
	FromIndex      int    `json:"fromIndex"`      // 起始节点在数组中的索引
	ToIndex        int    `json:"toIndex"`        // 目标节点在数组中的索引
	ConnectionType string `json:"connectionType"` // sequence, cause, parallel, condition
	Description    string `json:"description"`    // 连接描述
	Weight         int    `json:"weight"`         // 连接强度 1-10
}

// StorylineGenerator 故事线生成器
type StorylineGenerator struct {
	handler *LLMHandler
	model   string
}

// NewStorylineGenerator 创建故事线生成器
func NewStorylineGenerator(apiKey, baseURL, model string) *StorylineGenerator {
	systemPrompt := `你是一个专业的小说结构设计师，擅长创建复杂而引人入胜的故事线结构。

你的任务是根据提供的小说信息，生成完整的多线程故事结构，包括：
1. 主故事线：核心情节发展
2. 角色故事线：主要角色的成长弧
3. 情节故事线：重要的子情节发展
4. 主题故事线：深层主题的展现

设计原则：
1. **层次清晰**：主线突出，支线丰富但不喧宾夺主
2. **节奏控制**：张弛有度，高潮迭起
3. **角色发展**：每个重要角色都有完整的成长弧
4. **伏笔呼应**：前期埋下的伏笔要在后期得到呼应
5. **冲突递进**：从小冲突逐步升级到大冲突
6. **情感共鸣**：关注读者的情感体验

节点类型说明：
- start: 故事线的起始点
- event: 普通情节事件
- turning: 重要转折点
- merge: 多条线汇合点
- end: 故事线结束点

连接类型说明：
- sequence: 顺序发生
- cause: 因果关系
- parallel: 并行发生
- condition: 条件触发

请以 JSON 格式返回结果。`

	handler := NewLLMHandler(context.Background(), apiKey, baseURL, systemPrompt)

	if model == "" {
		model = "gpt-3.5-turbo"
	}

	return &StorylineGenerator{
		handler: handler,
		model:   model,
	}
}

// Generate 生成故事线结构
func (g *StorylineGenerator) Generate(req StorylineGenerateRequest) (*StorylineGenerateResponse, error) {
	// 设置默认值
	if req.StorylineCount <= 0 {
		req.StorylineCount = 3
	}
	if req.NodesPerLine <= 0 {
		req.NodesPerLine = 6
	}

	// 构建提示词
	prompt := fmt.Sprintf("请为以下小说生成完整的故事线结构：\n\n")
	prompt += fmt.Sprintf("【小说信息】\n")
	prompt += fmt.Sprintf("标题：%s\n", req.NovelTitle)

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("类型：%s\n", req.NovelGenre)
	}

	if req.WorldSetting != "" {
		prompt += fmt.Sprintf("世界观：%s\n", req.WorldSetting)
	}

	if req.MainConflict != "" {
		prompt += fmt.Sprintf("核心冲突：%s\n", req.MainConflict)
	}

	if len(req.Characters) > 0 {
		prompt += fmt.Sprintf("\n【主要角色】\n")
		for i, char := range req.Characters {
			prompt += fmt.Sprintf("%d. %s\n", i+1, char)
		}
	}

	// 添加已有故事线信息
	if len(req.ExistingStorylines) > 0 {
		prompt += fmt.Sprintf("\n【已有故事线】\n")
		prompt += fmt.Sprintf("以下故事线已经存在，请生成不同的新故事线，避免重复：\n")
		for i, existing := range req.ExistingStorylines {
			prompt += fmt.Sprintf("%d. %s - %s\n", i+1, existing.Title, existing.Description)
		}
	}

	prompt += fmt.Sprintf("\n【生成要求】\n")
	prompt += fmt.Sprintf("- 创建 %d 条故事线（包含主线和支线）\n", req.StorylineCount)
	prompt += fmt.Sprintf("- 每条故事线包含 %d 个关键节点\n", req.NodesPerLine)
	prompt += fmt.Sprintf("- 节点必须具体详细，包含明确的地点、事件、目标和结果\n")
	prompt += fmt.Sprintf("- 每个节点的描述要包含：在哪里、做什么、遇到谁、获得什么、如何影响后续\n")
	prompt += fmt.Sprintf("- 节点间要有清晰的逻辑关系和因果联系\n")
	prompt += fmt.Sprintf("- 考虑角色成长弧和情节发展的具体细节\n")
	prompt += fmt.Sprintf("- 预留伏笔和悬念设置点，并说明如何呼应\n")
	prompt += fmt.Sprintf("- 为每条故事线分配不同的颜色\n")
	if len(req.ExistingStorylines) > 0 {
		prompt += fmt.Sprintf("- 重要：新生成的故事线必须与已有故事线有明显区别，不能重复相同的主题或内容\n")
	}

	prompt += fmt.Sprintf("\n【节点描述示例】\n")
	prompt += fmt.Sprintf("好的节点描述：\"主角在青云山脉深处的古洞中，击败守护灵兽后获得上古功法《九霄诀》，领悟第一层心法，实力突破到灵师境界，为后续挑战宗门大比奠定基础\"\n")
	prompt += fmt.Sprintf("不好的节点描述：\"主角修炼突破\"（太空洞，缺少具体细节）\n")

	prompt += `

故事线类型说明：
- main: 主故事线（核心情节）
- character: 角色故事线（角色成长）
- plot: 情节故事线（子情节发展）
- theme: 主题故事线（主题展现）

请严格按照以下 JSON 格式返回：
{
  "storylines": [
    {
      "title": "故事线标题",
      "description": "故事线描述",
      "type": "main|character|plot|theme",
      "color": "#十六进制颜色",
      "priority": 1-10,
      "nodes": [
        {
          "title": "节点标题",
          "description": "节点详细描述",
          "nodeType": "start|event|turning|merge|end",
          "chapterRange": "涉及章节范围，如 '1-3' 或 '5'",
          "orderIndex": 0,
          "status": "planned"
        }
      ],
      "connections": [
        {
          "fromIndex": 0,
          "toIndex": 1,
          "connectionType": "sequence|cause|parallel|condition",
          "description": "连接描述",
          "weight": 1-10
        }
      ]
    }
  ]
}

不要包含任何 markdown 标记或其他文本，只返回纯 JSON。`

	// 调用 LLM
	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
		MaxTokens:   IntPtr(4000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return nil, fmt.Errorf("failed to generate storylines: %w", err)
	}

	// 清理响应
	cleanedResponse := CleanAIResponse(response)

	// 解析响应
	var result StorylineGenerateResponse
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		// 尝试更激进的清理
		// 移除所有非打印字符（除了换行、制表符和空格）
		aggressiveCleaned := ""
		for _, r := range cleanedResponse {
			if r == '\n' || r == '\r' || r == '\t' || r == ' ' || (r >= 32 && r < 127) || r >= 128 {
				aggressiveCleaned += string(r)
			}
		}

		// 再次尝试解析
		if err2 := json.Unmarshal([]byte(aggressiveCleaned), &result); err2 != nil {
			// 截断响应以避免日志过长
			truncated := cleanedResponse
			if len(truncated) > 500 {
				truncated = truncated[:500] + "... (truncated)"
			}
			return nil, fmt.Errorf("failed to parse response: %w (first 500 chars: %s)", err, truncated)
		}
	}

	return &result, nil
}

// OptimizeStoryline 根据反馈修改故事线描述
func (g *StorylineGenerator) OptimizeStoryline(currentDescription string, feedback string) (string, error) {
	prompt := fmt.Sprintf(`你是一个专业的小说结构设计师。请根据用户的修改意见，重写故事线描述。

【当前描述】
%s

【用户的修改意见】
%s

请根据用户的意见，生成新的故事线描述。要求：
1. 保持原有描述的风格和结构
2. 充分理解并应用用户的修改意见
3. 如果用户要求增加节点，请扩展描述内容
4. 如果用户要求修改某些方面，请针对性地调整
5. 保持描述的连贯性和完整性
6. 描述应该详细且具体，包含关键情节点

直接返回修改后的完整描述文本，不要添加任何额外的说明或标记。`, currentDescription, feedback)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
		MaxTokens:   IntPtr(3000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to optimize storyline: %w", err)
	}

	// 清理响应，移除可能的 markdown 标记
	cleanedResponse := CleanAIResponse(response)

	return cleanedResponse, nil
}

// ExpandStorylinePart 局部扩写故事线内容
func (g *StorylineGenerator) ExpandStorylinePart(fullDescription string, selectedText string, expandHint string) (string, error) {
	hintText := ""
	if expandHint != "" {
		hintText = fmt.Sprintf("\n\n【扩写要求】\n%s", expandHint)
	}

	prompt := fmt.Sprintf(`你是一个专业的小说结构设计师。用户选中了故事线描述中的一部分内容，希望你对这部分进行详细扩写。

【完整的故事线描述（提供上下文）】
%s

【用户选中要扩写的部分】
%s%s

请对选中的部分进行详细扩写，要求：
1. 保持与整体故事线的连贯性和一致性
2. 扩写应该更加详细和具体，增加情节细节
3. 如果是节点描述，要包含：具体地点、事件经过、涉及角色、关键对话、情感变化、结果影响
4. 如果是总体描述，要增加背景信息、冲突设置、发展脉络
5. 保持原有的风格和语气
6. 扩写后的内容应该是原内容的 2-3 倍长度
7. 内容要生动、有画面感，避免空洞的概括

直接返回扩写后的文本，不要添加任何额外的说明、标记或前缀。`, fullDescription, selectedText, hintText)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
		MaxTokens:   IntPtr(2000),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to expand storyline part: %w", err)
	}

	// 清理响应
	cleanedResponse := CleanAIResponse(response)

	return cleanedResponse, nil
}

// ExpandNode 扩展故事节点内容
func (g *StorylineGenerator) ExpandNode(nodeTitle, nodeDescription, context string) (string, error) {
	prompt := fmt.Sprintf(`请扩展以下故事节点的内容：

【节点信息】
标题：%s
当前描述：%s

【上下文】
%s

请生成更详细的节点描述，包括：
1. 具体发生的事件
2. 涉及的角色和行动
3. 情节推进的作用
4. 对后续发展的影响
5. 可能的伏笔设置

返回扩展后的描述（200-300字）。`, nodeTitle, nodeDescription, context)

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.7),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to expand node: %w", err)
	}

	return response, nil
}

// SuggestConnections 建议节点连接
func (g *StorylineGenerator) SuggestConnections(nodes []string) ([]GeneratedConnection, error) {
	prompt := fmt.Sprintf(`请分析以下故事节点，建议合理的连接关系：

【节点列表】
%s

请分析节点间的逻辑关系，建议连接方式，包括：
1. 时间顺序连接
2. 因果关系连接
3. 并行发展连接
4. 条件触发连接

以 JSON 格式返回连接建议：
{
  "connections": [
    {
      "fromIndex": 0,
      "toIndex": 1,
      "connectionType": "sequence|cause|parallel|condition",
      "description": "连接原因说明",
      "weight": 1-10
    }
  ]
}`, fmt.Sprintf("%v", nodes))

	options := QueryOptions{
		Model:       g.model,
		Temperature: Float32Ptr(0.6),
	}

	response, err := g.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return nil, fmt.Errorf("failed to suggest connections: %w", err)
	}

	// 清理和解析响应
	cleanedResponse := CleanAIResponse(response)

	var result struct {
		Connections []GeneratedConnection `json:"connections"`
	}

	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		return nil, fmt.Errorf("failed to parse connections: %w", err)
	}

	return result.Connections, nil
}
