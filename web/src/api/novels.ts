import { post, get, put, patch, del } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface Novel {
  id: number
  title: string
  authorId: number
  status: string
  genre?: string
  description?: string
  worldSetting?: string
  tags?: string
  coverImage?: string
  createdAt: string
  updatedAt: string
}

export interface Volume {
  id: number
  novelId: number
  title: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Chapter {
  id: number
  novelId: number
  volumeId?: number
  title: string
  content: string
  order: number
  summary?: string
  characterIds?: string
  plotPointIds?: string
  previousSummary?: string
  outline?: string
  status?: string
  createdAt: string
  updatedAt: string
}

export interface Character {
  id: number
  novelId: number
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface PlotPoint {
  id: number
  novelId: number
  title: string
  content?: string
  createdAt: string
  updatedAt: string
}

export interface QueryForm {
  pos?: number
  limit?: number
  keyword?: string
  filters?: Array<{
    name: string
    op: string
    value: any
  }>
  orders?: Array<{
    name: string
    op: 'asc' | 'desc'
  }>
}

export interface QueryResult<T> {
  total: number
  pos: number
  limit: number
  keyword?: string
  items: T[]
}

export const novelsApi = {
  // 小说相关
  queryNovels: (form: QueryForm): Promise<ApiResponse<QueryResult<Novel>>> => {
    return post('/novel', form)
  },
  
  getNovel: (id: number): Promise<ApiResponse<Novel>> => {
    return get(`/novel/${id}`)
  },
  
  createNovel: (data: Partial<Novel>): Promise<ApiResponse<Novel>> => {
    return put('/novel', data)
  },
  
  updateNovel: (id: number, data: Partial<Novel>): Promise<ApiResponse<Novel>> => {
    return patch(`/novel/${id}`, data)
  },
  
  deleteNovel: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/novel/${id}`)
  },
  
  // 卷相关
  queryVolumes: (novelId: number, form?: QueryForm): Promise<ApiResponse<QueryResult<Volume>>> => {
    return post('/volume', {
      ...form,
      filters: [
        ...(form?.filters || []),
        { name: 'novelId', op: '=', value: novelId }
      ]
    })
  },
  
  getVolume: (id: number): Promise<ApiResponse<Volume>> => {
    return get(`/volume/${id}`)
  },
  
  createVolume: (data: Partial<Volume>): Promise<ApiResponse<Volume>> => {
    return put('/volume', data)
  },
  
  updateVolume: (id: number, data: Partial<Volume>): Promise<ApiResponse<boolean>> => {
    return patch(`/volume/${id}`, data)
  },
  
  deleteVolume: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/volume/${id}`)
  },
  
  // 章节相关
  queryChapters: (novelId: number, form?: QueryForm): Promise<ApiResponse<QueryResult<Chapter>>> => {
    return post('/chapter', {
      ...form,
      filters: [
        ...(form?.filters || []),
        { name: 'novelId', op: '=', value: novelId }
      ],
      orders: form?.orders || [{ name: 'order', op: 'asc' }]
    })
  },
  
  getChapter: (id: number): Promise<ApiResponse<Chapter>> => {
    return get(`/chapter/${id}`)
  },
  
  createChapter: (data: Partial<Chapter>): Promise<ApiResponse<Chapter>> => {
    return put('/chapter', data)
  },
  
  updateChapter: (id: number, data: Partial<Chapter>): Promise<ApiResponse<boolean>> => {
    return patch(`/chapter/${id}`, data)
  },
  
  deleteChapter: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/chapter/${id}`)
  },
  
  // 角色相关
  queryCharacters: (novelId: number, form?: QueryForm): Promise<ApiResponse<QueryResult<Character>>> => {
    return post('/character', {
      ...form,
      filters: [
        ...(form?.filters || []),
        { name: 'novelId', op: '=', value: novelId }
      ]
    })
  },
  
  createCharacter: (data: Partial<Character>): Promise<ApiResponse<Character>> => {
    return put('/character', data)
  },
  
  updateCharacter: (id: number, data: Partial<Character>): Promise<ApiResponse<boolean>> => {
    return patch(`/character/${id}`, data)
  },
  
  deleteCharacter: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/character/${id}`)
  },
  
  // 情节相关
  queryPlotPoints: (novelId: number, form?: QueryForm): Promise<ApiResponse<QueryResult<PlotPoint>>> => {
    return post('/plotpoint', {
      ...form,
      filters: [
        ...(form?.filters || []),
        { name: 'novelId', op: '=', value: novelId }
      ]
    })
  },
  
  createPlotPoint: (data: Partial<PlotPoint>): Promise<ApiResponse<PlotPoint>> => {
    return put('/plotpoint', data)
  },
  
  updatePlotPoint: (id: number, data: Partial<PlotPoint>): Promise<ApiResponse<boolean>> => {
    return patch(`/plotpoint/${id}`, data)
  },
  
  deletePlotPoint: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/plotpoint/${id}`)
  },
  
  // AI 相关
  generateCharacter: (data: {
    name: string
    novelTitle?: string
    novelGenre?: string
    role?: string
    personality?: string
    background?: string
  }): Promise<ApiResponse<{
    name: string
    description: string
    personality: string
    background: string
    appearance: string
    skills: string
    goals: string
    weaknesses: string
  }>> => {
    return post('/ai/character/generate', data)
  },
  
  enhanceDescription: (data: {
    name: string
    description: string
  }): Promise<ApiResponse<{ description: string }>> => {
    return post('/ai/character/enhance', data)
  },
  
  generatePlot: (data: {
    title: string
    novelTitle?: string
    novelGenre?: string
    worldSetting?: string
    characters?: string
    plotType?: string
    context?: string
  }): Promise<ApiResponse<{
    title: string
    content: string
    summary: string
    conflict: string
    development: string
    characters: string
    impact: string
  }>> => {
    return post('/ai/plot/generate', data)
  },
  
  enhancePlotContent: (data: {
    title: string
    content: string
  }): Promise<ApiResponse<{ content: string }>> => {
    return post('/ai/plot/enhance', data)
  },
  
  // 章节 AI 生成
  generateChapter: (data: {
    title: string
    novelTitle?: string
    novelGenre?: string
    worldSetting?: string
    styleGuide?: string
    outline?: string
    characters?: string[]
    plotPoints?: string[]
    previousSummary?: string
    chapterNumber?: number
    targetWordCount?: number
    writingStyle?: string
    focusPoints?: string[]
    avoidComplete?: boolean
  }): Promise<ApiResponse<{
    title: string
    content: string
    summary: string
    keyEvents: string[]
    characterDev: string
    plotProgress: string
    foreshadowing: string
    nextChapterHint: string
  }>> => {
    return post('/ai/chapter/generate', data)
  },
  
  generateChapterSummary: (data: {
    title: string
    content: string
  }): Promise<ApiResponse<{ summary: string }>> => {
    return post('/ai/chapter/summary', data)
  },
  
  generateChapterSuggestions: (data: {
    novelTitle: string
    novelGenre?: string
    worldSetting?: string
    previousSummary?: string
    chapterNumber: number
  }): Promise<ApiResponse<{ suggestions: Array<{
    title: string
    outline: string
    description: string
    type: string
  }> }>> => {
    return post('/ai/chapter/suggestions', data)
  },
  
  generateChapterOutline: (data: {
    title: string
    novelTitle?: string
    novelGenre?: string
    previousSummary?: string
    plotPoints?: string[]
    chapterNumber?: number
  }): Promise<ApiResponse<{ outline: string }>> => {
    return post('/ai/chapter/outline', data)
  },
  
  refineChapterContent: (data: {
    title: string
    originalContent: string
    feedback: string
  }): Promise<ApiResponse<{ content: string }>> => {
    return post('/ai/chapter/refine', data)
  },
  
  expandContent: (data: {
    originalContent: string
    expandTarget: string
    expandHint?: string
    novelGenre?: string
    worldSetting?: string
    styleGuide?: string
  }): Promise<ApiResponse<{ content: string }>> => {
    return post('/ai/chapter/expand', data)
  },
  
  // 风格分析
  analyzeStyle: (data: {
    novelTitle: string
    novelGenre?: string
    referenceText: string
  }): Promise<ApiResponse<{
    analysis: {
      writingStyle: string
      keyFeatures: string[]
      dialogueStyle: string
      descriptionStyle: string
      pacingStyle: string
      vocabularyLevel: string
      sentencePattern: string
      examples: string[]
      styleGuide: string
    }
    styleGuide: string
  }>> => {
    return post('/ai/style/analyze', data)
  },
  
  extractSamples: (data: {
    referenceText: string
    sampleCount?: number
  }): Promise<ApiResponse<{
    samples: string[]
    count: number
  }>> => {
    return post('/ai/style/extract-samples', data)
  },
}

// 故事线相关接口
export interface Storyline {
  id: number
  novelId: number
  title: string
  description?: string
  type: 'main' | 'character' | 'plot' | 'theme'
  status: 'active' | 'completed' | 'paused'
  priority: number
  color: string
  createdAt: string
  updatedAt: string
  nodes?: StoryNode[]
}

export interface StoryNode {
  id: number
  storylineId: number
  title: string
  description?: string
  nodeType: 'start' | 'event' | 'turning' | 'merge' | 'end'
  position: Position
  chapterRange?: string
  characters: number[]
  plotPoints: number[]
  status: 'planned' | 'writing' | 'completed'
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export interface Position {
  x: number
  y: number
}

export interface NodeConnection {
  id: number
  fromNodeId: number
  toNodeId: number
  connectionType: 'sequence' | 'cause' | 'parallel' | 'condition'
  description?: string
  weight: number
  createdAt: string
  updatedAt: string
}

export interface StorylineWithStats extends Storyline {
  nodeCount: number
  completedNodes: number
  progress: number
}

// 在 novelsApi 对象中添加故事线相关方法
export const storylineApi = {
  // 故事线管理
  getStorylines: (novelId: number): Promise<ApiResponse<StorylineWithStats[]>> => {
    return get(`/storylines/${novelId}`)
  },
  
  createStoryline: (data: Partial<Storyline>): Promise<ApiResponse<Storyline>> => {
    return post('/storylines', data)
  },
  
  updateStoryline: (id: number, data: Partial<Storyline>): Promise<ApiResponse<Storyline>> => {
    return put(`/storylines/${id}`, data)
  },
  
  deleteStoryline: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/storylines/${id}`)
  },
  
  // 故事节点管理
  getStoryNodes: (storylineId: number): Promise<ApiResponse<StoryNode[]>> => {
    return get(`/story-nodes/${storylineId}`)
  },
  
  createStoryNode: (data: Partial<StoryNode>): Promise<ApiResponse<StoryNode>> => {
    return post('/story-nodes', data)
  },
  
  updateStoryNode: (id: number, data: Partial<StoryNode>): Promise<ApiResponse<StoryNode>> => {
    return put(`/story-nodes/${id}`, data)
  },
  
  deleteStoryNode: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/story-nodes/${id}`)
  },
  
  // 节点连接管理
  getNodeConnections: (storylineId: number): Promise<ApiResponse<NodeConnection[]>> => {
    return get(`/node-connections?storylineId=${storylineId}`)
  },
  
  createNodeConnection: (data: Partial<NodeConnection>): Promise<ApiResponse<NodeConnection>> => {
    return post('/node-connections', data)
  },
  
  deleteNodeConnection: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/node-connections/${id}`)
  },
  
  // AI 生成功能
  generateStorylines: (data: {
    novelId: number
    novelTitle?: string
    novelGenre?: string
    genre?: string
    worldSetting?: string
    characters?: string[]
    mainConflict?: string
    storylineCount?: number
    nodesPerLine?: number
    existingStorylines?: Array<{ title: string; description: string }>
  }): Promise<ApiResponse<{
    storylines: Array<{
      title: string
      description: string
      type: string
      color: string
      priority: number
      nodes: Array<{
        title: string
        description: string
        nodeType: string
        chapterRange: string
        orderIndex: number
        status: string
      }>
      connections: Array<{
        fromIndex: number
        toIndex: number
        connectionType: string
        description: string
        weight: number
      }>
    }>
  }>> => {
    return post('/ai/storyline/generate', data)
  },
  
  optimizeStoryline: (data: {
    currentDescription: string
    feedback: string
  }): Promise<ApiResponse<{ description: string }>> => {
    return post('/ai/storyline/optimize', data)
  },
  
  expandStorylinePart: (data: {
    fullDescription: string
    selectedText: string
    expandHint?: string
  }): Promise<ApiResponse<{ expandedText: string }>> => {
    return post('/ai/storyline/expand-part', data)
  },
  
  expandStoryNode: (data: {
    nodeTitle: string
    nodeDescription: string
    context?: string
  }): Promise<ApiResponse<{ description: string }>> => {
    return post('/ai/storyline/expand-node', data)
  },
  
  suggestNodeConnections: (data: {
    nodes: string[]
  }): Promise<ApiResponse<{
    connections: Array<{
      fromIndex: number
      toIndex: number
      connectionType: string
      description: string
      weight: number
    }>
  }>> => {
    return post('/ai/storyline/suggest-connections', data)
  },
}

// 设定相关接口
export interface NovelSetting {
  id: number
  novelId: number
  category: string
  title: string
  content?: string
  tags?: string
  orderIndex: number
  isImportant: boolean
  createdAt: string
  updatedAt: string
}

export const settingApi = {
  // 设定管理
  getSettings: (novelId: number, category?: string): Promise<ApiResponse<NovelSetting[]>> => {
    const url = category ? `/settings/${novelId}?category=${category}` : `/settings/${novelId}`
    return get(url)
  },
  
  getSettingsByCategory: (novelId: number): Promise<ApiResponse<Record<string, NovelSetting[]>>> => {
    return get(`/settings/${novelId}/by-category`)
  },
  
  createSetting: (data: Partial<NovelSetting>): Promise<ApiResponse<NovelSetting>> => {
    return post('/settings', data)
  },
  
  updateSetting: (id: number, data: Partial<NovelSetting>): Promise<ApiResponse<NovelSetting>> => {
    return put(`/settings/${id}`, data)
  },
  
  deleteSetting: (id: number): Promise<ApiResponse<boolean>> => {
    return del(`/settings/${id}`)
  },
  
  // AI 生成功能
  generateSetting: (data: {
    novelId: number
    novelTitle?: string
    novelGenre?: string
    category: string
    title?: string
    context?: string
    requirements?: string
  }): Promise<ApiResponse<{
    title: string
    content: string
    tags: string
  }>> => {
    return post('/ai/setting/generate', data)
  },
  
  enhanceSetting: (data: {
    title: string
    content: string
    enhanceHint?: string
  }): Promise<ApiResponse<{ content: string }>> => {
    return post('/ai/setting/enhance', data)
  },
}