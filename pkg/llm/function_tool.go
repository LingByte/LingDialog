package llm

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/LingByte/LingDialog/pkg/logger"
	"github.com/sashabaranov/go-openai"
	"go.uber.org/zap"
)

// FunctionToolCallback is the callback function type for function tools
type FunctionToolCallback func(arguments string) (string, error)

// FunctionToolDefinition defines a function tool
type FunctionToolDefinition struct {
	Name        string
	Description string
	Parameters  json.RawMessage
	Callback    FunctionToolCallback
}

// FunctionToolManager manages function tools
type FunctionToolManager struct {
	tools map[string]*FunctionToolDefinition
	mutex sync.RWMutex
}

// NewFunctionToolManager creates a new function tool manager
func NewFunctionToolManager() *FunctionToolManager {
	return &FunctionToolManager{
		tools: make(map[string]*FunctionToolDefinition),
	}
}

// RegisterTool registers a new function tool
func (m *FunctionToolManager) RegisterTool(name, description string, parameters json.RawMessage, callback FunctionToolCallback) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.tools[name] = &FunctionToolDefinition{
		Name:        name,
		Description: description,
		Parameters:  parameters,
		Callback:    callback,
	}

	logger.Info("Registered function tool",
		zap.String("name", name),
		zap.String("description", description))
}

// RegisterToolDefinition registers a tool using a definition struct
func (m *FunctionToolManager) RegisterToolDefinition(def *FunctionToolDefinition) {
	m.RegisterTool(def.Name, def.Description, def.Parameters, def.Callback)
}

// GetTools returns all registered tools in OpenAI format
func (m *FunctionToolManager) GetTools() []openai.Tool {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	tools := make([]openai.Tool, 0, len(m.tools))
	for _, tool := range m.tools {
		tools = append(tools, openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.Parameters,
			},
		})
	}

	return tools
}

// ListTools returns a list of all registered tool names
func (m *FunctionToolManager) ListTools() []string {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	names := make([]string, 0, len(m.tools))
	for name := range m.tools {
		names = append(names, name)
	}

	return names
}

// HandleToolCall handles a tool call from the LLM
func (m *FunctionToolManager) HandleToolCall(toolCall openai.ToolCall) (string, error) {
	m.mutex.RLock()
	tool, exists := m.tools[toolCall.Function.Name]
	m.mutex.RUnlock()

	if !exists {
		return "", fmt.Errorf("unknown tool: %s", toolCall.Function.Name)
	}

	logger.Info("Handling tool call",
		zap.String("tool", toolCall.Function.Name),
		zap.String("arguments", toolCall.Function.Arguments))

	result, err := tool.Callback(toolCall.Function.Arguments)
	if err != nil {
		logger.Error("Tool call failed",
			zap.String("tool", toolCall.Function.Name),
			zap.Error(err))
		return "", err
	}

	logger.Info("Tool call succeeded",
		zap.String("tool", toolCall.Function.Name),
		zap.String("result", result))

	return result, nil
}

// UnregisterTool removes a tool from the manager
func (m *FunctionToolManager) UnregisterTool(name string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.tools, name)
	logger.Info("Unregistered function tool", zap.String("name", name))
}

// ClearTools removes all registered tools
func (m *FunctionToolManager) ClearTools() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	m.tools = make(map[string]*FunctionToolDefinition)
	logger.Info("Cleared all function tools")
}
