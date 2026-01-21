package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"sync"
	"time"

	"github.com/code-100-precent/LingFramework/pkg/constants"
	"github.com/code-100-precent/LingFramework/pkg/logger"
	"github.com/code-100-precent/LingFramework/pkg/utils"
	"github.com/google/uuid"
	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

type LLMHandler struct {
	client          *openai.Client
	ctx             context.Context
	systemMsg       string
	baseURL         string
	mutex           sync.Mutex
	messages        []openai.ChatCompletionMessage
	hangupChan      chan struct{}
	interruptCh     chan struct{}
	functionManager *FunctionToolManager
	lastUsage       openai.Usage
	lastUsageValid  bool
}

type QueryOptions struct {
	Model               string
	MaxTokens           *int
	MaxCompletionTokens *int
	Temperature         *float32
	TopP                *float32
	FrequencyPenalty    *float32
	PresencePenalty     *float32
	Stop                []string
	N                   *int
	LogitBias           map[string]int
	User                string
	Stream              bool
	ResponseFormat      *openai.ChatCompletionResponseFormat
	Seed                *int

	// Optional context for logging
	UserID       *uint
	AssistantID  *int64
	CredentialID *uint
	SessionID    string
	ChatType     string
}

type ToolCallInfo struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

type LLMUsageInfo struct {
	// Request Information
	Model               string
	MaxTokens           *int
	MaxCompletionTokens *int
	Temperature         *float32
	TopP                *float32
	FrequencyPenalty    *float32
	PresencePenalty     *float32
	Stop                []string
	N                   *int
	LogitBias           map[string]int
	User                string
	Stream              bool
	ResponseFormat      *openai.ChatCompletionResponseFormat
	Seed                *int

	// Response Information
	ResponseID       string
	Object           string
	Created          int64
	FinishReason     string
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int

	// Context Information
	SystemPrompt string
	MessageCount int

	// Timing Information
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	Duration  int64     `json:"duration"`

	// Tool Call Information
	HasToolCalls  bool           `json:"hasToolCalls"`
	ToolCallCount int            `json:"toolCallCount"`
	ToolCalls     []ToolCallInfo `json:"toolCalls,omitempty"`

	// Optional context for logging
	UserID       *uint
	AssistantID  *int64
	CredentialID *uint
	SessionID    string
	ChatType     string
}

func NewLLMHandler(ctx context.Context, apiKey, baseURL, systemPrompt string) *LLMHandler {
	config := openai.DefaultConfig(apiKey)
	config.BaseURL = baseURL
	client := openai.NewClientWithConfig(config)

	messages := []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		},
	}

	functionManager := NewFunctionToolManager()

	return &LLMHandler{
		client:          client,
		systemMsg:       systemPrompt,
		baseURL:         baseURL,
		ctx:             ctx,
		messages:        messages,
		hangupChan:      make(chan struct{}),
		interruptCh:     make(chan struct{}, 1),
		functionManager: functionManager,
	}
}

func (h *LLMHandler) Query(text, model string) (string, error) {
	return h.QueryWithOptions(text, QueryOptions{Model: model, Temperature: Float32Ptr(0.7)})
}

func (h *LLMHandler) QueryWithOptions(text string, options QueryOptions) (string, error) {
	startTime := time.Now()

	h.mutex.Lock()
	h.cleanupIncompleteToolCalls()

	h.messages = append(h.messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: text,
	})

	logger.Debug("Added user message to history",
		zap.String("user_text", text),
		zap.Int("total_messages", len(h.messages)),
	)

	h.mutex.Unlock()

	tools := h.functionManager.GetTools()

	maxIterations := 10
	var finalResponse string
	var finalUsage openai.Usage
	var finalResponseID string
	var finalObject string
	var finalCreated int64
	var finalFinishReason string

	var allToolCalls []ToolCallInfo

	h.mutex.Lock()
	for iteration := 0; iteration < maxIterations; iteration++ {
		logger.Debug("Building LLM request",
			zap.Int("iteration", iteration),
			zap.Int("message_count", len(h.messages)),
			zap.String("model", options.Model),
		)

		sanitizedMessages := make([]openai.ChatCompletionMessage, 0, len(h.messages))
		for _, msg := range h.messages {
			sanitizedMsg := openai.ChatCompletionMessage{
				Role:      msg.Role,
				Content:   "",
				ToolCalls: msg.ToolCalls,
			}

			if msg.Content != "" {
				sanitizedMsg.Content = msg.Content
			} else if msg.Role == openai.ChatMessageRoleSystem {
				sanitizedMsg.Content = "You are a helpful assistant."
			}

			if msg.ToolCallID != "" {
				sanitizedMsg.ToolCallID = msg.ToolCallID
			}

			sanitizedMessages = append(sanitizedMessages, sanitizedMsg)
		}

		request := openai.ChatCompletionRequest{
			Model:    options.Model,
			Messages: sanitizedMessages,
			Tools:    tools,
		}

		if options.MaxTokens != nil {
			request.MaxTokens = *options.MaxTokens
		}
		if options.MaxCompletionTokens != nil {
			request.MaxCompletionTokens = *options.MaxCompletionTokens
		}
		if options.Temperature != nil {
			request.Temperature = *options.Temperature
		}
		if options.TopP != nil {
			request.TopP = *options.TopP
		}
		if options.FrequencyPenalty != nil {
			request.FrequencyPenalty = *options.FrequencyPenalty
		}
		if options.PresencePenalty != nil {
			request.PresencePenalty = *options.PresencePenalty
		}
		if len(options.Stop) > 0 {
			request.Stop = options.Stop
		}
		if options.N != nil {
			request.N = *options.N
		}
		if options.LogitBias != nil {
			request.LogitBias = options.LogitBias
		}
		if options.User != "" {
			request.User = options.User
		}
		if options.ResponseFormat != nil {
			request.ResponseFormat = options.ResponseFormat
		}
		if options.Seed != nil {
			request.Seed = options.Seed
		}
		request.Stream = options.Stream

		if request.Model == "" {
			request.Model = openai.GPT4o
		}

		logger.Info("Sending request to LLM API",
			zap.String("base_url", h.baseURL),
			zap.String("model", request.Model),
			zap.Int("message_count", len(request.Messages)),
			zap.Int("iteration", iteration),
		)

		response, err := h.client.CreateChatCompletion(h.ctx, request)
		if err != nil {
			h.mutex.Unlock()
			logger.Error("LLM API call failed",
				zap.String("base_url", h.baseURL),
				zap.String("model", request.Model),
				zap.Error(err),
			)
			return "", fmt.Errorf("error querying LLM API: %w", err)
		}

		logger.Info("Received response from LLM API",
			zap.String("response_id", response.ID),
			zap.String("object", response.Object),
			zap.Int("choices_count", len(response.Choices)),
		)

		if len(response.Choices) == 0 {
			h.mutex.Unlock()
			return "", fmt.Errorf("no choices in response")
		}

		message := response.Choices[0].Message

		logger.Info("LLM response received",
			zap.String("role", message.Role),
			zap.String("content", message.Content),
			zap.Int("content_length", len(message.Content)),
			zap.Int("tool_calls", len(message.ToolCalls)),
			zap.String("finish_reason", string(response.Choices[0].FinishReason)),
			zap.Int("message_count", len(h.messages)),
		)

		finalUsage.PromptTokens += response.Usage.PromptTokens
		finalUsage.CompletionTokens += response.Usage.CompletionTokens
		finalUsage.TotalTokens += response.Usage.TotalTokens

		if response.ID != "" {
			finalResponseID = response.ID
		}
		if response.Object != "" {
			finalObject = response.Object
		}
		if response.Created != 0 {
			finalCreated = response.Created
		}
		if len(response.Choices) > 0 && response.Choices[0].FinishReason != "" {
			finalFinishReason = string(response.Choices[0].FinishReason)
		}

		if len(message.ToolCalls) > 0 {
			logger.Info("Tool calls detected", zap.Int("count", len(message.ToolCalls)))

			for _, toolCall := range message.ToolCalls {
				allToolCalls = append(allToolCalls, ToolCallInfo{
					ID:        toolCall.ID,
					Name:      toolCall.Function.Name,
					Arguments: toolCall.Function.Arguments,
				})
			}

			h.messages = append(h.messages, message)

			processedToolCallIDs := make(map[string]bool)

			for _, toolCall := range message.ToolCalls {
				result, err := h.functionManager.HandleToolCall(toolCall)
				if err != nil {
					logger.Error("Failed to handle tool call",
						zap.String("tool", toolCall.Function.Name),
						zap.Error(err))
					h.messages = append(h.messages, openai.ChatCompletionMessage{
						Role:       openai.ChatMessageRoleTool,
						Content:    fmt.Sprintf("Error: %v", err),
						ToolCallID: toolCall.ID,
					})
				} else {
					logger.Info("Tool call result",
						zap.String("tool", toolCall.Function.Name),
						zap.String("result", result))
					h.messages = append(h.messages, openai.ChatCompletionMessage{
						Role:       openai.ChatMessageRoleTool,
						Content:    result,
						ToolCallID: toolCall.ID,
					})
				}
				processedToolCallIDs[toolCall.ID] = true
			}

			for _, toolCall := range message.ToolCalls {
				if !processedToolCallIDs[toolCall.ID] {
					logger.Warn("Tool call was not processed, adding error response",
						zap.String("toolCallID", toolCall.ID))
					h.messages = append(h.messages, openai.ChatCompletionMessage{
						Role:       openai.ChatMessageRoleTool,
						Content:    "Error: Tool call was not processed",
						ToolCallID: toolCall.ID,
					})
				}
			}

			request.Messages = h.messages
			continue
		}

		if message.Content == "" {
			logger.Warn("Empty response content from LLM",
				zap.String("finish_reason", string(response.Choices[0].FinishReason)),
				zap.Int("message_count", len(h.messages)),
			)
			h.mutex.Unlock()
			return "", fmt.Errorf("empty response content from LLM")
		}

		h.messages = append(h.messages, message)
		finalResponse = message.Content
		break
	}

	if finalResponse == "" {
		h.mutex.Unlock()
		h.cleanupIncompleteToolCalls()
		return "", fmt.Errorf("max iterations reached without final response")
	}

	h.mutex.Unlock()

	endTime := time.Now()
	duration := endTime.Sub(startTime).Milliseconds()

	h.lastUsage = finalUsage
	h.lastUsageValid = true

	usageInfo := &LLMUsageInfo{
		Model:               options.Model,
		MaxTokens:           options.MaxTokens,
		MaxCompletionTokens: options.MaxCompletionTokens,
		Temperature:         options.Temperature,
		TopP:                options.TopP,
		FrequencyPenalty:    options.FrequencyPenalty,
		PresencePenalty:     options.PresencePenalty,
		Stop:                options.Stop,
		N:                   options.N,
		LogitBias:           options.LogitBias,
		User:                options.User,
		Stream:              options.Stream,
		ResponseFormat:      options.ResponseFormat,
		Seed:                options.Seed,
		ResponseID:          finalResponseID,
		Object:              finalObject,
		Created:             finalCreated,
		FinishReason:        finalFinishReason,
		PromptTokens:        finalUsage.PromptTokens,
		CompletionTokens:    finalUsage.CompletionTokens,
		TotalTokens:         finalUsage.TotalTokens,
		SystemPrompt:        h.systemMsg,
		MessageCount:        len(h.messages),
		StartTime:           startTime,
		EndTime:             endTime,
		Duration:            duration,
		HasToolCalls:        len(allToolCalls) > 0,
		ToolCallCount:       len(allToolCalls),
		ToolCalls:           allToolCalls,
		UserID:              options.UserID,
		AssistantID:         options.AssistantID,
		CredentialID:        options.CredentialID,
		SessionID:           options.SessionID,
		ChatType:            options.ChatType,
	}

	utils.Sig().Emit(constants.LLMUsage, usageInfo, text, finalResponse)

	return finalResponse, nil
}

func (h *LLMHandler) QueryStream(text string, options QueryOptions, callback func(segment string, isComplete bool) error) (string, error) {
	startTime := time.Now()

	h.mutex.Lock()

	h.messages = append(h.messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleUser,
		Content: text,
	})

	tools := h.functionManager.GetTools()

	request := openai.ChatCompletionRequest{
		Model:    options.Model,
		Messages: h.messages,
		Stream:   true,
		Tools:    tools,
	}

	if options.MaxTokens != nil {
		request.MaxTokens = *options.MaxTokens
	}
	if options.MaxCompletionTokens != nil {
		request.MaxCompletionTokens = *options.MaxCompletionTokens
	}
	if options.Temperature != nil {
		request.Temperature = *options.Temperature
	}
	if options.TopP != nil {
		request.TopP = *options.TopP
	}
	if options.FrequencyPenalty != nil {
		request.FrequencyPenalty = *options.FrequencyPenalty
	}
	if options.PresencePenalty != nil {
		request.PresencePenalty = *options.PresencePenalty
	}
	if len(options.Stop) > 0 {
		request.Stop = options.Stop
	}
	if options.N != nil {
		request.N = *options.N
	}
	if options.LogitBias != nil {
		request.LogitBias = options.LogitBias
	}
	if options.User != "" {
		request.User = options.User
	}
	if options.ResponseFormat != nil {
		request.ResponseFormat = options.ResponseFormat
	}
	if options.Seed != nil {
		request.Seed = options.Seed
	}

	if request.Model == "" {
		request.Model = openai.GPT4o
	}

	request.StreamOptions = &openai.StreamOptions{
		IncludeUsage: true,
	}

	streamID := fmt.Sprintf("stream-%s", uuid.New().String())
	logger.Info("Starting LLM stream", zap.String("streamID", streamID))

	stream, err := h.client.CreateChatCompletionStream(h.ctx, request)
	if err != nil {
		h.mutex.Unlock()
		return "", fmt.Errorf("error creating chat completion stream: %w", err)
	}

	h.mutex.Unlock()
	defer stream.Close()

	var buffer string
	fullResponse := ""
	var finishReason string
	var responseID string
	var created int64
	var object string

	var collectedToolCalls []openai.ToolCall
	toolCallMap := make(map[int]*openai.ToolCall)

	var allToolCalls []ToolCallInfo

	punctuationRegex := regexp.MustCompile(`([.,;:!?，。！？；：])\s*`)

	for {
		select {
		case <-h.interruptCh:
			logger.Info("LLM stream interrupted", zap.String("streamID", streamID))
			return fullResponse, fmt.Errorf("stream interrupted")
		case <-h.hangupChan:
			logger.Info("LLM stream hangup requested", zap.String("streamID", streamID))
			return fullResponse, fmt.Errorf("hangup requested")
		default:
		}

		response, err := stream.Recv()
		if err != nil {
			if err == io.EOF {
				break
			}
			return fullResponse, fmt.Errorf("error receiving from stream: %w", err)
		}

		if response.ID != "" {
			responseID = response.ID
		}
		if response.Object != "" {
			object = response.Object
		}
		if response.Created != 0 {
			created = response.Created
		}

		if response.Usage != nil {
			h.mutex.Lock()
			h.lastUsage = *response.Usage
			h.lastUsageValid = true
			h.mutex.Unlock()
		}

		if len(response.Choices) > 0 {
			if response.Choices[0].FinishReason != "" {
				finishReason = string(response.Choices[0].FinishReason)
			}

			if len(response.Choices[0].Delta.ToolCalls) > 0 {
				for _, deltaToolCall := range response.Choices[0].Delta.ToolCalls {
					if deltaToolCall.Index == nil {
						continue
					}
					idx := *deltaToolCall.Index

					if toolCallMap[idx] == nil {
						toolCallMap[idx] = &openai.ToolCall{
							ID:   deltaToolCall.ID,
							Type: deltaToolCall.Type,
							Function: openai.FunctionCall{
								Name:      deltaToolCall.Function.Name,
								Arguments: deltaToolCall.Function.Arguments,
							},
						}
					} else {
						if deltaToolCall.Function.Name != "" {
							toolCallMap[idx].Function.Name = deltaToolCall.Function.Name
						}
						if deltaToolCall.Function.Arguments != "" {
							toolCallMap[idx].Function.Arguments += deltaToolCall.Function.Arguments
						}
					}
				}
			}

			if response.Choices[0].Delta.Content != "" {
				content := response.Choices[0].Delta.Content
				buffer += content
				fullResponse += content

				matches := punctuationRegex.FindAllStringSubmatchIndex(buffer, -1)
				if len(matches) > 0 {
					lastIdx := 0
					for _, match := range matches {
						segment := buffer[lastIdx:match[1]]
						if segment != "" && callback != nil {
							if err := callback(segment, false); err != nil {
								logger.Error("Failed to process stream segment", zap.Error(err))
							}
						}
						lastIdx = match[1]
					}

					if lastIdx < len(buffer) {
						buffer = buffer[lastIdx:]
					} else {
						buffer = ""
					}
				}
			}
		}
	}

	maxIdx := 0
	for idx := range toolCallMap {
		if idx > maxIdx {
			maxIdx = idx
		}
	}
	for i := 0; i <= maxIdx; i++ {
		if toolCall, exists := toolCallMap[i]; exists {
			collectedToolCalls = append(collectedToolCalls, *toolCall)
		}
	}

	if buffer != "" && callback != nil {
		if err := callback(buffer, false); err != nil {
			logger.Error("Failed to process final stream segment", zap.Error(err))
		}
	}

	h.mutex.Lock()
	if len(collectedToolCalls) > 0 {
		logger.Info("Tool calls detected in stream", zap.Int("count", len(collectedToolCalls)))

		for _, toolCall := range collectedToolCalls {
			allToolCalls = append(allToolCalls, ToolCallInfo{
				ID:        toolCall.ID,
				Name:      toolCall.Function.Name,
				Arguments: toolCall.Function.Arguments,
			})
		}

		h.messages = append(h.messages, openai.ChatCompletionMessage{
			Role:      openai.ChatMessageRoleAssistant,
			Content:   fullResponse,
			ToolCalls: collectedToolCalls,
		})

		for _, toolCall := range collectedToolCalls {
			result, err := h.functionManager.HandleToolCall(toolCall)
			if err != nil {
				logger.Error("Failed to handle tool call",
					zap.String("tool", toolCall.Function.Name),
					zap.Error(err))
				h.messages = append(h.messages, openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					Content:    fmt.Sprintf("Error: %v", err),
					ToolCallID: toolCall.ID,
				})
			} else {
				logger.Info("Tool call result",
					zap.String("tool", toolCall.Function.Name),
					zap.String("result", result))
				h.messages = append(h.messages, openai.ChatCompletionMessage{
					Role:       openai.ChatMessageRoleTool,
					Content:    result,
					ToolCallID: toolCall.ID,
				})
			}
		}

		request.Messages = h.messages
		request.Stream = false
		h.mutex.Unlock()

		finalResp, err := h.client.CreateChatCompletion(h.ctx, request)
		if err != nil {
			return fullResponse, fmt.Errorf("error getting final response after tool call: %w", err)
		}

		finalResponse := ""
		if len(finalResp.Choices) > 0 {
			finalResponse = finalResp.Choices[0].Message.Content
			h.mutex.Lock()
			h.messages = append(h.messages, finalResp.Choices[0].Message)
			h.mutex.Unlock()
		}

		endTime := time.Now()
		duration := endTime.Sub(startTime).Milliseconds()

		if len(finalResp.Choices) > 0 {
			h.mutex.Lock()
			h.lastUsage.PromptTokens += finalResp.Usage.PromptTokens
			h.lastUsage.CompletionTokens += finalResp.Usage.CompletionTokens
			h.lastUsage.TotalTokens += finalResp.Usage.TotalTokens
			h.lastUsageValid = true
			h.mutex.Unlock()
		}

		usageInfo := &LLMUsageInfo{
			Model:               request.Model,
			MaxTokens:           options.MaxTokens,
			MaxCompletionTokens: options.MaxCompletionTokens,
			Temperature:         options.Temperature,
			TopP:                options.TopP,
			FrequencyPenalty:    options.FrequencyPenalty,
			PresencePenalty:     options.PresencePenalty,
			Stop:                options.Stop,
			N:                   options.N,
			LogitBias:           options.LogitBias,
			User:                options.User,
			Stream:              true,
			ResponseFormat:      options.ResponseFormat,
			Seed:                options.Seed,
			ResponseID:          responseID,
			Object:              object,
			Created:             created,
			FinishReason:        finishReason,
			PromptTokens:        h.lastUsage.PromptTokens,
			CompletionTokens:    h.lastUsage.CompletionTokens,
			TotalTokens:         h.lastUsage.TotalTokens,
			SystemPrompt:        h.systemMsg,
			MessageCount:        len(h.messages),
			StartTime:           startTime,
			EndTime:             endTime,
			Duration:            duration,
			HasToolCalls:        len(allToolCalls) > 0,
			ToolCallCount:       len(allToolCalls),
			ToolCalls:           allToolCalls,
			UserID:              options.UserID,
			AssistantID:         options.AssistantID,
			CredentialID:        options.CredentialID,
			SessionID:           options.SessionID,
			ChatType:            options.ChatType,
		}

		utils.Sig().Emit(constants.LLMUsage, usageInfo, text, fullResponse+finalResponse)

		if callback != nil {
			if err := callback(finalResponse, false); err != nil {
				logger.Error("Failed to process final response segment", zap.Error(err))
			}
			if err := callback("", true); err != nil {
				logger.Error("Failed to send completion signal", zap.Error(err))
			}
		}

		return fullResponse + finalResponse, nil
	}

	h.messages = append(h.messages, openai.ChatCompletionMessage{
		Role:    openai.ChatMessageRoleAssistant,
		Content: fullResponse,
	})

	endTime := time.Now()
	duration := endTime.Sub(startTime).Milliseconds()

	if h.lastUsageValid {
		usageInfo := &LLMUsageInfo{
			Model:               request.Model,
			MaxTokens:           options.MaxTokens,
			MaxCompletionTokens: options.MaxCompletionTokens,
			Temperature:         options.Temperature,
			TopP:                options.TopP,
			FrequencyPenalty:    options.FrequencyPenalty,
			PresencePenalty:     options.PresencePenalty,
			Stop:                options.Stop,
			N:                   options.N,
			LogitBias:           options.LogitBias,
			User:                options.User,
			Stream:              true,
			ResponseFormat:      options.ResponseFormat,
			Seed:                options.Seed,
			ResponseID:          responseID,
			Object:              object,
			Created:             created,
			FinishReason:        finishReason,
			PromptTokens:        h.lastUsage.PromptTokens,
			CompletionTokens:    h.lastUsage.CompletionTokens,
			TotalTokens:         h.lastUsage.TotalTokens,
			SystemPrompt:        h.systemMsg,
			MessageCount:        len(h.messages),
			StartTime:           startTime,
			EndTime:             endTime,
			Duration:            duration,
			HasToolCalls:        false,
			ToolCallCount:       0,
			ToolCalls:           nil,
			UserID:              options.UserID,
			AssistantID:         options.AssistantID,
			CredentialID:        options.CredentialID,
			SessionID:           options.SessionID,
			ChatType:            options.ChatType,
		}

		utils.Sig().Emit(constants.LLMUsage, usageInfo, text, fullResponse)
	}

	logger.Info("LLM stream completed",
		zap.String("streamID", streamID),
		zap.Int("responseLength", len(fullResponse)),
		zap.Int("totalTokens", h.lastUsage.TotalTokens),
	)

	h.mutex.Unlock()

	return fullResponse, nil
}

func (h *LLMHandler) RegisterFunctionTool(name, description string, parameters json.RawMessage, callback FunctionToolCallback) {
	h.functionManager.RegisterTool(name, description, parameters, callback)
}

func (h *LLMHandler) RegisterFunctionToolDefinition(def *FunctionToolDefinition) {
	h.functionManager.RegisterToolDefinition(def)
}

func (h *LLMHandler) GetFunctionTools() []openai.Tool {
	return h.functionManager.GetTools()
}

func (h *LLMHandler) ListFunctionTools() []string {
	return h.functionManager.ListTools()
}

func (h *LLMHandler) GetLastUsage() (openai.Usage, bool) {
	h.mutex.Lock()
	defer h.mutex.Unlock()
	return h.lastUsage, h.lastUsageValid
}

func (h *LLMHandler) cleanupIncompleteToolCalls() {
	for i := len(h.messages) - 1; i >= 0; i-- {
		msg := h.messages[i]
		if msg.Role == openai.ChatMessageRoleAssistant && len(msg.ToolCalls) > 0 {
			toolCallIDs := make(map[string]bool)
			for _, toolCall := range msg.ToolCalls {
				toolCallIDs[toolCall.ID] = false
			}

			for j := i + 1; j < len(h.messages); j++ {
				nextMsg := h.messages[j]
				if nextMsg.Role == openai.ChatMessageRoleTool && nextMsg.ToolCallID != "" {
					if _, exists := toolCallIDs[nextMsg.ToolCallID]; exists {
						toolCallIDs[nextMsg.ToolCallID] = true
					}
				}
			}

			hasIncomplete := false
			for _, hasResponse := range toolCallIDs {
				if !hasResponse {
					hasIncomplete = true
					break
				}
			}

			if hasIncomplete {
				logger.Warn("Found incomplete tool calls, removing assistant message and subsequent messages",
					zap.Int("messageIndex", i),
					zap.Int("messagesToRemove", len(h.messages)-i))
				h.messages = h.messages[:i]
				break
			}
		}
	}
}

func (h *LLMHandler) ResetMessages() {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	h.messages = []openai.ChatCompletionMessage{
		{
			Role:    openai.ChatMessageRoleSystem,
			Content: h.systemMsg,
		},
	}
}

func (h *LLMHandler) SetSystemPrompt(systemPrompt string) {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	h.systemMsg = systemPrompt

	if len(h.messages) > 0 && h.messages[0].Role == openai.ChatMessageRoleSystem {
		h.messages[0].Content = systemPrompt
	} else {
		systemMessage := openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemPrompt,
		}
		h.messages = append([]openai.ChatCompletionMessage{systemMessage}, h.messages...)
	}
}

func (h *LLMHandler) GetMessages() []openai.ChatCompletionMessage {
	h.mutex.Lock()
	defer h.mutex.Unlock()

	messages := make([]openai.ChatCompletionMessage, len(h.messages))
	copy(messages, h.messages)
	return messages
}

func Float32Ptr(v float32) *float32 {
	return &v
}

func Float64Ptr(v float64) *float32 {
	val := float32(v)
	return &val
}

func IntPtr(v int) *int {
	return &v
}
