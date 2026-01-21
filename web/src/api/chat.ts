import { post } from '@/utils/request'
import { ApiResponse } from '@/utils/request'
import { getApiBaseURL } from '@/config/apiConfig'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

export interface ChatResponse {
  message: ChatMessage
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export const chatApi = {
  // 普通聊天（非流式）
  chat: (data: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return post('/ai/chat', { ...data, stream: false })
  },
  
  // 清除对话历史
  clearHistory: (): Promise<ApiResponse<any>> => {
    return post('/ai/chat/clear')
  },
}

// 流式聊天需要使用 fetch API
export const chatStream = async (
  messages: ChatMessage[],
  onMessage: (content: string) => void,
  onComplete: () => void,
  onError: (error: string) => void,
  temperature: number = 0.7,
  maxTokens: number = 2000
) => {
  try {
    // 使用完整的 API URL
    const apiBaseURL = getApiBaseURL()
    const response = await fetch(`${apiBaseURL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        stream: true,
        temperature,
        maxTokens,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.msg || errorData.error || '请求失败')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    let buffer = ''
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk
      
      // 按双换行符分割事件
      const events = buffer.split('\n\n')
      // 保留最后一个不完整的事件
      buffer = events.pop() || ''
      
      for (const event of events) {
        if (!event.trim()) continue
        
        const lines = event.split('\n')
        let eventType = ''
        let eventData = ''
        
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            eventData = line.slice(5).trim()
          }
        }
        
        // 处理事件
        if (eventType === 'done' || eventData === '[DONE]') {
          onComplete()
          return
        }
        
        if (eventType === 'error') {
          onError(eventData)
          return
        }
        
        if (eventType === 'message' && eventData) {
          try {
            const parsed = JSON.parse(eventData)
            if (parsed.content) {
              onMessage(parsed.content)
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e, eventData)
          }
        }
      }
    }

    onComplete()
  } catch (error: any) {
    onError(error.message || '发送消息失败')
  }
}
