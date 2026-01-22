package llm

import (
	"fmt"
	"time"

	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/google/uuid"
	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// Message 通用消息结构
type Message struct {
	Role    string `json:"role"`    // user, assistant, system
	Content string `json:"content"` // 消息内容
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
