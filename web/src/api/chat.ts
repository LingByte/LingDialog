import { post, get, del } from '@/utils/request'
import { ApiResponse } from '@/utils/request'
import { getApiBaseURL } from '@/config/apiConfig'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequest {
  sessionId?: number
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
  novelId?: number
  title?: string
}

export interface ChatResponse {
  sessionId: number
  message: ChatMessage
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ChatSession {
  id: number
  userId: number
  novelId?: number
  title: string
  description: string
  status: string
  messageCount: number
  totalTokens: number
  createdAt: string
  updatedAt: string
  novel?: {
    id: number
    title: string
    genre: string
  }
}

export interface SessionListResponse {
  sessions: ChatSession[]
  total: number
  page: number
  pageSize: number
}

export interface UsageStats {
  dailyUsage: Array<{
    date: string
    messageCount: number
    sessionCount: number
    totalTokens: number
    promptTokens: number
    completionTokens: number
  }>
  totalStats: {
    totalMessages: number
    totalSessions: number
    totalTokens: number
  }
  periodDays: number
}

export const chatApi = {
  // 普通聊天（非流式）
  chat: (data: ChatRequest): Promise<ApiResponse<ChatResponse>> => {
    return post('/ai/chat', { ...data, stream: false })
  },
  
  // 获取会话列表
  getSessions: (params: {
    page?: number
    pageSize?: number
    novelId?: number
    status?: string
  } = {}): Promise<ApiResponse<SessionListResponse>> => {
    return get('/ai/chat/sessions', { params })
  },
  
  // 获取会话消息
  getSessionMessages: (sessionId: number): Promise<ApiResponse<{
    session: ChatSession
    messages: Array<{
      id: number
      sessionId: number
      role: string
      content: string
      promptTokens: number
      completionTokens: number
      totalTokens: number
      model: string
      temperature: number
      maxTokens: number
      responseTime: number
      createdAt: string
    }>
  }>> => {
    return get(`/ai/chat/sessions/${sessionId}/messages`)
  },
  
  // 删除会话
  deleteSession: (sessionId: number): Promise<ApiResponse<any>> => {
    return del(`/ai/chat/sessions/${sessionId}`)
  },
  
  // 清除对话历史
  clearHistory: (): Promise<ApiResponse<any>> => {
    return post('/ai/chat/clear')
  },
  
  // 获取使用统计
  getUsageStats: (days: number = 7): Promise<ApiResponse<UsageStats>> => {
    return get('/ai/chat/usage', { params: { days } })
  },
}

// 流式聊天需要使用 fetch API
export const chatStream = async (
  messages: ChatMessage[],
  onMessage: (content: string) => void,
  onComplete: (sessionId?: number) => void,
  onError: (error: string) => void,
  temperature: number = 0.7,
  maxTokens: number = 2000,
  novelId?: number,
  sessionId?: number,
  title?: string
) => {
  try {
    // 获取认证token
    const token = localStorage.getItem('auth_token')
    
    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    
    // 添加认证头
    if (token) {
      headers.Authorization = `Bearer ${token}`
      console.log('流式请求携带token:', { 
        hasToken: !!token, 
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...'
      })
    } else {
      console.log('流式请求未携带token')
    }
    
    // 使用完整的 API URL
    const apiBaseURL = getApiBaseURL()
    const response = await fetch(`${apiBaseURL}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sessionId,
        messages,
        stream: true,
        temperature,
        maxTokens,
        novelId,
        title,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      // 处理401未授权错误
      if (response.status === 401) {
        // 清除认证状态
        localStorage.removeItem('auth_token')
        throw new Error('登录已过期，请重新登录')
      }
      
      throw new Error(errorData.msg || errorData.error || '请求失败')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('无法读取响应流')
    }

    let buffer = ''
    let currentSessionId: number | undefined
    
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
          onComplete(currentSessionId)
          return
        }
        
        if (eventType === 'error') {
          onError(eventData)
          return
        }
        
        if (eventType === 'session' && eventData) {
          try {
            const parsed = JSON.parse(eventData)
            currentSessionId = parsed.sessionId
          } catch (e) {
            console.error('Failed to parse session data:', e, eventData)
          }
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

    onComplete(currentSessionId)
  } catch (error: any) {
    onError(error.message || '发送消息失败')
  }
}
