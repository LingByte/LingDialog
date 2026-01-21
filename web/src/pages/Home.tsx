import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout/Layout'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import { 
  BookOpen, 
  PenTool, 
  TrendingUp, 
  Calendar,
  FileText,
  Users,
  Clock,
  Target,
  Plus,
  BarChart3,
  Zap,
  BookMarked
} from 'lucide-react'

interface DashboardStats {
  totalNovels: number
  totalChapters: number
  totalWords: number
  todayWords: number
  weeklyWords: number
  monthlyWords: number
  todayChapters: number
  weeklyChapters: number
  recentActivity: Array<{
    id: string
    type: 'chapter' | 'novel' | 'edit'
    title: string
    time: string
  }>
}

function Home() {
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalNovels: 0,
    totalChapters: 0,
    totalWords: 0,
    todayWords: 0,
    weeklyWords: 0,
    monthlyWords: 0,
    todayChapters: 0,
    weeklyChapters: 0,
    recentActivity: []
  })

  useEffect(() => {
    // TODO: 从API获取真实数据
    // 这里先使用模拟数据
    setStats({
      totalNovels: 3,
      totalChapters: 24,
      totalWords: 48650,
      todayWords: 1250,
      weeklyWords: 8900,
      monthlyWords: 32400,
      todayChapters: 2,
      weeklyChapters: 7,
      recentActivity: [
        { id: '1', type: 'chapter', title: '第十二章：转折点', time: '2小时前' },
        { id: '2', type: 'edit', title: '修改了《星辰大海》的设定', time: '4小时前' },
        { id: '3', type: 'chapter', title: '第十一章：新的开始', time: '昨天' },
        { id: '4', type: 'novel', title: '创建了新小说《时光旅者》', time: '2天前' },
      ]
    })
  }, [])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chapter':
        return <FileText className="w-4 h-4" />
      case 'novel':
        return <BookOpen className="w-4 h-4" />
      case 'edit':
        return <PenTool className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'chapter':
        return 'text-blue-600 bg-blue-100'
      case 'novel':
        return 'text-green-600 bg-green-100'
      case 'edit':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="p-8 max-w-md text-center">
            <BookMarked className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">欢迎来到 LingFramework</h1>
            <p className="text-gray-600 mb-6">AI 驱动的小说创作平台</p>
            <div className="space-y-3">
              <Link to="/login">
                <Button className="w-full">登录</Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" className="w-full">注册</Button>
              </Link>
            </div>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 页面标题 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              欢迎回来，{user?.displayName || user?.firstName || '创作者'}
            </h1>
            <p className="text-gray-600 mt-2">继续您的创作之旅</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总小说数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalNovels}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总章节数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalChapters}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">总字数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalWords.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">今日字数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayWords.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 写作进度 */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">写作进度</h2>
                  <Target className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">本周进度</span>
                      <span className="text-sm text-gray-500">{stats.weeklyWords} / 10000 字</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min((stats.weeklyWords / 10000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">本月进度</span>
                      <span className="text-sm text-gray-500">{stats.monthlyWords} / 50000 字</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min((stats.monthlyWords / 50000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.todayChapters}</p>
                      <p className="text-sm text-gray-600">今日章节</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{stats.weeklyChapters}</p>
                      <p className="text-sm text-gray-600">本周章节</p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* 最近活动 */}
            <div>
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">最近活动</h2>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="space-y-4">
                  {stats.recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="mt-8">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">快速操作</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/novels/create">
                  <Button className="w-full h-16 flex items-center justify-center space-x-3">
                    <Plus className="w-5 h-5" />
                    <span>创建新小说</span>
                  </Button>
                </Link>
                
                <Link to="/novels">
                  <Button variant="outline" className="w-full h-16 flex items-center justify-center space-x-3">
                    <BookOpen className="w-5 h-5" />
                    <span>管理小说</span>
                  </Button>
                </Link>
                
                <Link to="/chat">
                  <Button variant="outline" className="w-full h-16 flex items-center justify-center space-x-3">
                    <Zap className="w-5 h-5" />
                    <span>AI 助手</span>
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Home

