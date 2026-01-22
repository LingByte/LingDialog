import { get, post } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

// 写作目标
export interface WritingGoal {
  id: number
  userId: number
  date: string
  dailyGoal: number
  weeklyGoal: number
  monthlyGoal: number
  isAiGenerated: boolean
  createdAt: string
  updatedAt: string
}

// 进度信息
export interface ProgressInfo {
  current: number
  target: number
}

// 活动记录
export interface Activity {
  id: number
  userId: number
  type: string
  title: string
  description: string
  novelId?: number
  chapterId?: number
  createdAt: string
  novel?: {
    id: number
    title: string
    genre: string
  }
  chapter?: {
    id: number
    title: string
  }
}

// 写作统计
export interface WritingStats {
  // 基础统计
  totalNovels: number
  totalWords: number      // 总字数（所有章节）
  totalChapters: number   // 总章节数
  monthlyChapters: number
  weeklyWords: number
  todayWords: number
  
  // 目标设置
  goals: WritingGoal
  
  // 进度统计
  todayProgress: ProgressInfo
  weeklyProgress: ProgressInfo
  monthlyProgress: ProgressInfo
  
  // 完成度
  todayChapters: number
  weeklyChapters: number
  completionRate: number
  
  // 最近活动
  recentActivities: Activity[]
}

// 更新进度请求
export interface UpdateProgressRequest {
  date: string
  wordCount: number
  chapterCount: number
}

// 创建活动请求
export interface CreateActivityRequest {
  type: string
  title: string
  description?: string
  novelId?: number
  chapterId?: number
}

// 设置目标请求
export interface SetGoalsRequest {
  date: string
  dailyGoal: number
  weeklyGoal: number
  monthlyGoal: number
}

export const writingStatsApi = {
  // 获取写作统计
  getWritingStats: (): Promise<ApiResponse<WritingStats>> => {
    return get('/writing-stats')
  },
  
  // 更新写作进度
  updateProgress: (data: UpdateProgressRequest): Promise<ApiResponse<any>> => {
    return post('/writing-stats/progress', data)
  },
  
  // 创建活动记录
  createActivity: (data: CreateActivityRequest): Promise<ApiResponse<Activity>> => {
    return post('/writing-stats/activity', data)
  },
  
  // 设置写作目标
  setGoals: (data: SetGoalsRequest): Promise<ApiResponse<WritingGoal>> => {
    return post('/writing-stats/goals', data)
  },
}

export default writingStatsApi