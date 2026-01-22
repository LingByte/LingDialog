package llm

import (
	"context"
	"fmt"
	"time"

	"github.com/LingByte/LingDialog/pkg/config"
	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/google/uuid"
	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// LLMHandler 兼容现有代码的LLM处理器
type LLMHandler struct {
	client *openai.Client
	ctx    context.Context
}

// NewLLMHandler 创建LLM处理器（兼容现有代码）
func NewLLMHandler(ctx context.Context, apiKey, baseURL, model string) *LLMHandler {
	config := openai.DefaultConfig(apiKey)
	if baseURL != "" {
		config.BaseURL = baseURL
	}

	return &LLMHandler{
		client: openai.NewClientWithConfig(config),
		ctx:    ctx,
	}
}

// QueryOptions 查询选项
type QueryOptions struct {
	Model       string
	Temperature *float32
	MaxTokens   *int
	Stream      bool
}

// QueryWithOptions 使用选项查询
func (h *LLMHandler) QueryWithOptions(prompt string, options QueryOptions) (string, error) {
	// 构建请求
	request := openai.ChatCompletionRequest{
		Model: options.Model,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	if options.Temperature != nil {
		request.Temperature = *options.Temperature
	}
	if options.MaxTokens != nil {
		request.MaxTokens = *options.MaxTokens
	}

	// 调用 OpenAI API
	resp, err := h.client.CreateChatCompletion(h.ctx, request)
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response from LLM")
	}

	return resp.Choices[0].Message.Content, nil
}

// QueryStream 流式查询
func (h *LLMHandler) QueryStream(prompt string, options QueryOptions, callback func(segment string, isComplete bool) error) (string, error) {
	// 构建请求
	request := openai.ChatCompletionRequest{
		Model: options.Model,
		Messages: []openai.ChatCompletionMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Stream: true,
	}

	if options.Temperature != nil {
		request.Temperature = *options.Temperature
	}
	if options.MaxTokens != nil {
		request.MaxTokens = *options.MaxTokens
	}

	// 调用流式API
	stream, err := h.client.CreateChatCompletionStream(h.ctx, request)
	if err != nil {
		return "", err
	}
	defer stream.Close()

	var fullResponse string
	for {
		response, err := stream.Recv()
		if err != nil {
			if err.Error() == "EOF" {
				// 调用完成回调
				if callback != nil {
					callback("", true)
				}
				break
			}
			return "", err
		}

		if len(response.Choices) > 0 {
			content := response.Choices[0].Delta.Content
			if content != "" {
				fullResponse += content
				// 调用进度回调
				if callback != nil {
					if err := callback(content, false); err != nil {
						return fullResponse, err
					}
				}
			}
		}
	}

	return fullResponse, nil
}

// Float32Ptr 返回float32指针
func Float32Ptr(f float32) *float32 {
	return &f
}

// IntPtr 返回int指针
func IntPtr(i int) *int {
	return &i
}

// Message 通用消息结构
type Message struct {
	Role    string `json:"role"`    // user, assistant, system
	Content string `json:"content"` // 消息内容
}

// GetModel 获取模型名称
func GetModel() string {
	_, _, model := config.GetLLMConfig()
	return model
}

// Chat 通用聊天方法（非流式）
func (g *CharacterGenerator) Chat(messages []Message, temperature float32, maxTokens int) (string, error) {
	// 构建 OpenAI 消息格式
	openaiMessages := make([]openai.ChatCompletionMessage, len(messages))
	for i, msg := range messages {
		openaiMessages[i] = openai.ChatCompletionMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// 构建请求
	request := openai.ChatCompletionRequest{
		Model:       g.model,
		Messages:    openaiMessages,
		Temperature: temperature,
	}
	if maxTokens > 0 {
		request.MaxTokens = maxTokens
	}

	// 调用 OpenAI API
	resp, err := g.handler.client.CreateChatCompletion(g.handler.ctx, request)
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("no response from LLM")
	}

	return resp.Choices[0].Message.Content, nil
}

// GetModel 获取当前使用的模型名称
func (g *CharacterGenerator) GetModel() string {
	return g.model
}

// ChatStream 通用聊天方法（流式）
func (g *CharacterGenerator) ChatStream(messages []Message, temperature float32, maxTokens int, callback func(segment string, isComplete bool) error) (string, error) {
	startTime := time.Now()

	// 构建 OpenAI 消息格式
	openaiMessages := make([]openai.ChatCompletionMessage, len(messages))
	for i, msg := range messages {
		openaiMessages[i] = openai.ChatCompletionMessage{
			Role:    msg.Role,
			Content: msg.Content,
		}
	}

	// 构建请求
	request := openai.ChatCompletionRequest{
		Model:       g.model,
		Messages:    openaiMessages,
		Stream:      true,
		Temperature: temperature,
	}
	if maxTokens > 0 {
		request.MaxTokens = maxTokens
	}

	request.StreamOptions = &openai.StreamOptions{
		IncludeUsage: true,
	}

	streamID := fmt.Sprintf("stream-%s", uuid.New().String())
	logger.Info("Starting chat stream", zap.String("streamID", streamID))

	// 创建流
	stream, err := g.handler.client.CreateChatCompletionStream(g.handler.ctx, request)
	if err != nil {
		logger.Error("Failed to create chat stream", zap.Error(err))
		return "", err
	}
	defer stream.Close()

	var fullResponse string
	var totalTokens int

	// 读取流
	for {
		response, err := stream.Recv()
		if err != nil {
			logger.Info("Chat stream completed",
				zap.String("streamID", streamID),
				zap.Duration("duration", time.Since(startTime)),
				zap.Int("totalTokens", totalTokens))

			// 调用完成回调
			if callback != nil {
				callback("", true)
			}
			return fullResponse, nil
		}

		if len(response.Choices) > 0 {
			content := response.Choices[0].Delta.Content
			if content != "" {
				fullResponse += content
				if callback != nil {
					if err := callback(content, false); err != nil {
						logger.Error("Callback error", zap.Error(err))
						return fullResponse, err
					}
				}
			}
		}

		// 记录 token 使用情况
		if response.Usage != nil {
			totalTokens = response.Usage.TotalTokens
		}
	}
}
