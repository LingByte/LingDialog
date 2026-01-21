package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// StyleAnalysisRequest 风格分析请求
type StyleAnalysisRequest struct {
	NovelTitle   string   `json:"novelTitle"`   // 小说标题
	NovelGenre   string   `json:"novelGenre"`   // 小说类型
	Samples      []string `json:"samples"`      // 样本章节（多个片段）
	AnalysisType string   `json:"analysisType"` // 分析类型：writing_style/dialogue/description/pacing
}

// StyleAnalysisResponse 风格分析响应
type StyleAnalysisResponse struct {
	WritingStyle     string   `json:"writingStyle"`     // 写作风格总结
	KeyFeatures      []string `json:"keyFeatures"`      // 关键特征
	DialogueStyle    string   `json:"dialogueStyle"`    // 对话风格
	DescriptionStyle string   `json:"descriptionStyle"` // 描写风格
	PacingStyle      string   `json:"pacingStyle"`      // 节奏风格
	VocabularyLevel  string   `json:"vocabularyLevel"`  // 词汇水平
	SentencePattern  string   `json:"sentencePattern"`  // 句式特点
	Examples         []string `json:"examples"`         // 典型例句
	StyleGuide       string   `json:"styleGuide"`       // 风格指南（用于生成时参考）
}

// NovelChunk 小说片段（用于分块处理）
type NovelChunk struct {
	ChapterTitle string `json:"chapterTitle"`
	Content      string `json:"content"`
	Position     int    `json:"position"` // 在小说中的位置（开头/中间/结尾）
	WordCount    int    `json:"wordCount"`
}

// StyleAnalyzer 风格分析器
type StyleAnalyzer struct {
	handler *LLMHandler
	model   string
}

// NewStyleAnalyzer 创建风格分析器
func NewStyleAnalyzer(apiKey, baseURL, model string) *StyleAnalyzer {
	systemPrompt := `你是一个专业的文学风格分析师，擅长分析小说的写作风格、叙事技巧和语言特点。

你的任务是：
1. 分析提供的小说片段，提取其写作风格特征
2. 总结作者的叙事技巧和语言习惯
3. 生成可用于 AI 写作的风格指南

分析维度：
- 写作风格：整体风格（简洁/华丽/写实/浪漫等）
- 对话风格：对话的特点和处理方式
- 描写风格：环境、人物、动作的描写方式
- 节奏控制：情节推进的节奏和张弛
- 词汇特点：常用词汇、句式结构
- 叙事视角：第一人称/第三人称，全知/限知

请以 JSON 格式返回分析结果。`

	handler := NewLLMHandler(context.Background(), apiKey, baseURL, systemPrompt)

	if model == "" {
		model = "gpt-3.5-turbo"
	}

	return &StyleAnalyzer{
		handler: handler,
		model:   model,
	}
}

// AnalyzeStyle 分析小说风格
func (a *StyleAnalyzer) AnalyzeStyle(req StyleAnalysisRequest) (*StyleAnalysisResponse, error) {
	// 构建提示词
	prompt := fmt.Sprintf("请分析以下小说的写作风格：\n\n")
	prompt += fmt.Sprintf("小说：%s\n", req.NovelTitle)

	if req.NovelGenre != "" {
		prompt += fmt.Sprintf("类型：%s\n", req.NovelGenre)
	}

	prompt += fmt.Sprintf("\n【样本片段】\n")
	for i, sample := range req.Samples {
		prompt += fmt.Sprintf("\n--- 片段 %d ---\n%s\n", i+1, sample)
	}

	prompt += `

请从以下维度分析这部小说的写作风格：

1. 整体写作风格（简洁/华丽/写实/浪漫等）
2. 关键特征（列举3-5个最突出的特点）
3. 对话风格（对话的处理方式和特点）
4. 描写风格（环境、人物、动作的描写方式）
5. 节奏控制（情节推进的节奏）
6. 词汇水平（用词特点）
7. 句式特点（句子结构和长度）
8. 典型例句（从样本中提取2-3个最能体现风格的句子）
9. 风格指南（总结成一段话，用于指导 AI 模仿这种风格写作）

⚠️ 重要：请严格按照以下 JSON 格式返回，字段名必须使用英文：
{
  "writingStyle": "整体风格描述",
  "keyFeatures": ["特征1", "特征2", "特征3"],
  "dialogueStyle": "对话风格描述",
  "descriptionStyle": "描写风格描述",
  "pacingStyle": "节奏风格描述",
  "vocabularyLevel": "词汇水平描述",
  "sentencePattern": "句式特点描述",
  "examples": ["例句1", "例句2"],
  "styleGuide": "风格指南（一段完整的文字）"
}

不要使用中文字段名，不要包含任何 markdown 标记或其他文本，只返回纯 JSON。`

	// 调用 LLM
	options := QueryOptions{
		Model:       a.model,
		Temperature: Float32Ptr(0.5), // 较低温度以保持分析准确性
		MaxTokens:   IntPtr(2000),
	}

	response, err := a.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze style: %w", err)
	}

	// 清理响应
	cleanedResponse := CleanAIResponse(response)

	// 解析响应
	var result StyleAnalysisResponse
	if err := json.Unmarshal([]byte(cleanedResponse), &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w (response: %s)", err, cleanedResponse)
	}

	return &result, nil
}

// ChunkNovel 将长篇小说分块（智能采样）
func (a *StyleAnalyzer) ChunkNovel(fullText string, targetChunks int) []NovelChunk {
	// 简单的分块策略：
	// 1. 开头部分（展现开篇风格）
	// 2. 中间部分（展现叙事风格）
	// 3. 结尾部分（展现收尾风格）
	// 4. 对话密集部分（展现对话风格）
	// 5. 描写密集部分（展现描写风格）

	chunks := []NovelChunk{}
	totalLength := len(fullText)

	// 每块大约 3000 字
	chunkSize := 3000

	// 开头
	if totalLength > chunkSize {
		chunks = append(chunks, NovelChunk{
			ChapterTitle: "开头部分",
			Content:      fullText[:chunkSize],
			Position:     0,
			WordCount:    chunkSize,
		})
	}

	// 中间
	if totalLength > chunkSize*3 {
		midStart := totalLength/2 - chunkSize/2
		chunks = append(chunks, NovelChunk{
			ChapterTitle: "中间部分",
			Content:      fullText[midStart : midStart+chunkSize],
			Position:     1,
			WordCount:    chunkSize,
		})
	}

	// 结尾
	if totalLength > chunkSize*2 {
		endStart := totalLength - chunkSize
		if endStart < 0 {
			endStart = 0
		}
		chunks = append(chunks, NovelChunk{
			ChapterTitle: "结尾部分",
			Content:      fullText[endStart:],
			Position:     2,
			WordCount:    len(fullText[endStart:]),
		})
	}

	return chunks
}

// ExtractSamples 从小说中提取代表性样本
func (a *StyleAnalyzer) ExtractSamples(fullText string, sampleCount int) []string {
	chunks := a.ChunkNovel(fullText, sampleCount)
	samples := make([]string, 0, len(chunks))

	for _, chunk := range chunks {
		samples = append(samples, chunk.Content)
	}

	return samples
}

// GenerateStyleGuide 生成风格指南（用于后续写作）
func (a *StyleAnalyzer) GenerateStyleGuide(analysis *StyleAnalysisResponse) string {
	guide := fmt.Sprintf("【写作风格指南】\n\n")
	guide += fmt.Sprintf("整体风格：%s\n\n", analysis.WritingStyle)

	if len(analysis.KeyFeatures) > 0 {
		guide += "关键特征：\n"
		for _, feature := range analysis.KeyFeatures {
			guide += fmt.Sprintf("- %s\n", feature)
		}
		guide += "\n"
	}

	if analysis.DialogueStyle != "" {
		guide += fmt.Sprintf("对话风格：%s\n\n", analysis.DialogueStyle)
	}

	if analysis.DescriptionStyle != "" {
		guide += fmt.Sprintf("描写风格：%s\n\n", analysis.DescriptionStyle)
	}

	if analysis.PacingStyle != "" {
		guide += fmt.Sprintf("节奏控制：%s\n\n", analysis.PacingStyle)
	}

	if analysis.SentencePattern != "" {
		guide += fmt.Sprintf("句式特点：%s\n\n", analysis.SentencePattern)
	}

	if len(analysis.Examples) > 0 {
		guide += "典型例句：\n"
		for _, example := range analysis.Examples {
			guide += fmt.Sprintf("「%s」\n", example)
		}
		guide += "\n"
	}

	if analysis.StyleGuide != "" {
		guide += fmt.Sprintf("写作指导：\n%s\n", analysis.StyleGuide)
	}

	return guide
}

// CompareStyles 比较两个小说的风格差异
func (a *StyleAnalyzer) CompareStyles(style1, style2 *StyleAnalysisResponse) (string, error) {
	prompt := fmt.Sprintf(`请比较以下两种写作风格的异同：

风格 A：
- 整体风格：%s
- 对话风格：%s
- 描写风格：%s

风格 B：
- 整体风格：%s
- 对话风格：%s
- 描写风格：%s

请分析：
1. 主要相似点
2. 主要差异点
3. 各自的优势
4. 适合的场景

返回简洁的分析（300字以内）。`,
		style1.WritingStyle, style1.DialogueStyle, style1.DescriptionStyle,
		style2.WritingStyle, style2.DialogueStyle, style2.DescriptionStyle)

	options := QueryOptions{
		Model:       a.model,
		Temperature: Float32Ptr(0.5),
	}

	response, err := a.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to compare styles: %w", err)
	}

	return response, nil
}

// SuggestStyleImprovements 建议风格改进
func (a *StyleAnalyzer) SuggestStyleImprovements(currentStyle *StyleAnalysisResponse, targetGenre string) (string, error) {
	prompt := fmt.Sprintf(`当前写作风格：
%s

目标类型：%s

请针对目标类型，建议如何改进当前的写作风格，包括：
1. 需要保留的优点
2. 需要改进的方面
3. 具体的改进建议
4. 参考的优秀作品

返回简洁的建议（400字以内）。`,
		a.GenerateStyleGuide(currentStyle), targetGenre)

	options := QueryOptions{
		Model:       a.model,
		Temperature: Float32Ptr(0.7),
	}

	response, err := a.handler.QueryWithOptions(prompt, options)
	if err != nil {
		return "", fmt.Errorf("failed to suggest improvements: %w", err)
	}

	return response, nil
}

// ExtractDialogueSamples 提取对话样本（用于学习对话风格）
func (a *StyleAnalyzer) ExtractDialogueSamples(text string) []string {
	// 简单的对话提取（查找引号内的内容）
	dialogues := []string{}

	// 查找中文引号
	lines := strings.Split(text, "\n")
	for _, line := range lines {
		// 检查中文双引号
		if strings.Contains(line, "\u201c") && strings.Contains(line, "\u201d") {
			dialogues = append(dialogues, line)
		} else if strings.Contains(line, "\u300c") && strings.Contains(line, "\u300d") {
			// 检查中文书名号
			dialogues = append(dialogues, line)
		}
	}

	// 限制数量
	if len(dialogues) > 20 {
		dialogues = dialogues[:20]
	}

	return dialogues
}

// ExtractDescriptionSamples 提取描写样本（用于学习描写风格）
func (a *StyleAnalyzer) ExtractDescriptionSamples(text string) []string {
	// 简单的描写提取（查找较长的非对话段落）
	descriptions := []string{}

	paragraphs := strings.Split(text, "\n\n")
	for _, para := range paragraphs {
		// 跳过对话
		if strings.Contains(para, "\u201c") || strings.Contains(para, "\u300c") {
			continue
		}

		// 选择较长的段落（可能是描写）
		if len(para) > 100 && len(para) < 500 {
			descriptions = append(descriptions, para)
		}
	}

	// 限制数量
	if len(descriptions) > 10 {
		descriptions = descriptions[:10]
	}

	return descriptions
}
