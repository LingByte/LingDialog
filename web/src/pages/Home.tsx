import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { writingStatsApi, WritingStats } from '@/api/writingStats'
import Layout from '@/components/Layout/Layout'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
import toast from 'react-hot-toast'
import { 
  BookOpen, 
  PenTool, 
  TrendingUp,
  FileText,
  Clock,
  Target,
  Plus,
  BarChart3,
  Zap,
  Sparkles,
  Calendar,
  ArrowRight,
  Edit3,
  Brain,
  Lightbulb
} from 'lucide-react'

function Home() {
  const { user, isAuthenticated } = useAuthStore()
  const [stats, setStats] = useState<WritingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalForm, setGoalForm] = useState({
    dailyGoal: 2000,
    weeklyGoal: 15000,
    monthlyGoal: 80000
  })

  useEffect(() => {
    if (isAuthenticated) {
      loadWritingStats()
    }
  }, [isAuthenticated])

  const loadWritingStats = async () => {
    try {
      setLoading(true)
      const response = await writingStatsApi.getWritingStats()
      if (response.code === 200) {
        setStats(response.data)
        // 更新表单的默认值
        setGoalForm({
          dailyGoal: response.data.goals.dailyGoal,
          weeklyGoal: response.data.goals.weeklyGoal,
          monthlyGoal: response.data.goals.monthlyGoal
        })
      } else {
        throw new Error(response.msg || '获取统计数据失败')
      }
    } catch (error: any) {
      console.error('获取写作统计失败:', error)
      toast.error('获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSetGoals = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await writingStatsApi.setGoals({
        date: today,
        ...goalForm
      })
      
      if (response.code === 200) {
        toast.success('目标设置成功！')
        setShowGoalModal(false)
        loadWritingStats() // 重新加载统计数据
      } else {
        throw new Error(response.msg || '设置目标失败')
      }
    } catch (error: any) {
      console.error('设置目标失败:', error)
      toast.error(error.message || '设置目标失败')
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'chapter_created':
        return <FileText className="w-4 h-4" />
      case 'novel_created':
        return <BookOpen className="w-4 h-4" />
      case 'character_updated':
      case 'novel_updated':
        return <PenTool className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'chapter_created':
        return 'text-blue-600 bg-blue-100'
      case 'novel_created':
        return 'text-green-600 bg-green-100'
      case 'character_updated':
      case 'novel_updated':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return '刚刚'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`
    if (diffInSeconds < 172800) return '昨天'
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}天前`
    return date.toLocaleDateString('zh-CN')
  }

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
          {/* Hero Section */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>
            
            <div className="relative max-w-7xl mx-auto px-4 py-24">
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex justify-center mb-8">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <BookOpen className="w-10 h-10 text-gray-100" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Sparkles className="w-3 h-3 text-gray-100" />
                      </div>
                    </div>
                  </div>
                  
                  <h1 className="text-6xl font-bold mb-6">
                    <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text">
                      LingDialog
                    </span>
                  </h1>
                  <p className="text-2xl text-gray-700 mb-4">AI 驱动的智能小说创作平台</p>
                  <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
                    让人工智能成为您的创作伙伴，激发无限灵感，构建精彩故事，提升创作效率
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
                >
                  <Link to="/register">
                    <Button size="xl" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-gray-100 px-8 py-4 text-lg">
                      开始创作
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="xl" className="px-8 py-4 text-lg border-2 border-purple-200 hover:border-purple-300">
                      立即登录
                    </Button>
                  </Link>
                </motion.div>

                {/* 特性展示 */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
                >
                  <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Brain className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">AI 智能辅助</h3>
                    <p className="text-gray-600">
                      强大的AI助手帮您构思情节、塑造角色、优化文笔，让创作更加轻松高效
                    </p>
                  </Card>

                  <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Edit3 className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">专业编辑器</h3>
                    <p className="text-gray-600">
                      现代化的编辑界面，支持实时预览、版本管理、多设备同步，专注创作体验
                    </p>
                  </Card>

                  <Card className="p-8 text-center bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                    <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Lightbulb className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4">灵感管理</h3>
                    <p className="text-gray-600">
                      智能故事线管理、角色关系图谱、情节发展追踪，让复杂故事井然有序
                    </p>
                  </Card>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* 欢迎区域 */}
          <motion.div 
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 text-gray-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold mb-2 text-gray-900">
                      欢迎回来，{user?.displayName || user?.firstName || '创作者'}！
                    </h1>
                    <p className="text-xl text-gray-900 mb-6">
                      今天也要继续精彩的创作之旅 ✨
                    </p>
                    <div className="flex items-center space-x-6 text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5" />
                        <span>{new Date().toLocaleDateString('zh-CN', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          weekday: 'long'
                        })}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Target className="w-5 h-5" />
                          <span>今日目标：{stats?.goals.dailyGoal || 2000}字</span>
                        </div>
                        <button
                          onClick={() => setShowGoalModal(true)}
                          className="p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="设置目标"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="hidden lg:block">
                    <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-gray-200" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 统计卡片 */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {loading ? (
              // 加载状态
              Array.from({ length: 4 }).map((_, index) => (
                <Card key={index} className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded animate-pulse mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                    </div>
                    <div className="p-4 bg-gray-200 rounded-2xl animate-pulse">
                      <div className="w-6 h-6"></div>
                    </div>
                  </div>
                </Card>
              ))
            ) : stats ? (
              <>
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">总小说数</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalNovels}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {stats.totalNovels > 0 ? `共 ${stats.totalNovels} 部作品` : '开始创作吧'}
                      </p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                      <BookOpen className="w-6 h-6 text-gray-100" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">本月章节数</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.monthlyChapters}</p>
                      <p className="text-xs text-green-600 mt-1">+{stats.weeklyChapters} 本周</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg">
                      <FileText className="w-6 h-6 text-gray-100" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">总字数</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalWords?.toLocaleString() || 0}</p>
                      <p className="text-xs text-purple-600 mt-1">共 {stats.totalChapters || 0} 章节</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                      <BarChart3 className="w-6 h-6 text-gray-100" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">今日字数</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.todayWords.toLocaleString()}</p>
                      <p className="text-xs text-blue-600 mt-1">目标：{stats.goals.dailyGoal.toLocaleString()}字</p>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                      <TrendingUp className="w-6 h-6 text-gray-100" />
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              // 错误状态
              <div className="col-span-full text-center py-8">
                <p className="text-gray-500">加载统计数据失败</p>
                <Button 
                  onClick={loadWritingStats}
                  className="mt-4"
                  size="sm"
                >
                  重新加载
                </Button>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 写作进度 */}
            <motion.div 
              className="lg:col-span-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">写作进度</h2>
                  <div className="flex items-center space-x-2 text-gray-500">
                    <Target className="w-5 h-5" />
                    <span className="text-sm">
                      {stats?.goals.isAiGenerated ? 'AI智能目标' : '默认目标'}
                    </span>
                  </div>
                </div>
                
                {loading ? (
                  <div className="space-y-8">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index}>
                        <div className="flex justify-between items-center mb-3">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                ) : stats ? (
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-base font-medium text-gray-700">今日进度</span>
                        <span className="text-sm text-gray-500">
                          {stats.todayProgress.current} / {stats.todayProgress.target} 字
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div 
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${Math.min((stats.todayProgress.current / stats.todayProgress.target) * 100, 100)}%` 
                          }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-base font-medium text-gray-700">本周进度</span>
                        <span className="text-sm text-gray-500">
                          {stats.weeklyProgress.current.toLocaleString()} / {stats.weeklyProgress.target.toLocaleString()} 字
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${Math.min((stats.weeklyProgress.current / stats.weeklyProgress.target) * 100, 100)}%` 
                          }}
                          transition={{ duration: 1, delay: 0.7 }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-base font-medium text-gray-700">本月进度</span>
                        <span className="text-sm text-gray-500">
                          {stats.monthlyProgress.current.toLocaleString()} / {stats.monthlyProgress.target.toLocaleString()} 字
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <motion.div 
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" 
                          initial={{ width: 0 }}
                          animate={{ 
                            width: `${Math.min((stats.monthlyProgress.current / stats.monthlyProgress.target) * 100, 100)}%` 
                          }}
                          transition={{ duration: 1, delay: 0.9 }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">暂无进度数据</p>
                  </div>
                )}

                {stats && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">{stats.todayChapters}</p>
                        <p className="text-sm text-gray-600">今日章节</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">{stats.weeklyChapters}</p>
                        <p className="text-sm text-gray-600">本周章节</p>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">{Math.round(stats.completionRate)}%</p>
                        <p className="text-sm text-gray-600">完成度</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* 最近活动 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">最近活动</h2>
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
                
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3">
                        <div className="p-2 bg-gray-200 rounded-xl animate-pulse">
                          <div className="w-4 h-4"></div>
                        </div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : stats && stats.recentActivities.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivities.map((activity, index) => (
                      <motion.div 
                        key={activity.id} 
                        className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                      >
                        <div className={`p-2 rounded-xl ${getActivityColor(activity.type)}`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          {activity.description && (
                            <p className="text-xs text-gray-600 truncate">
                              {activity.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">{formatTimeAgo(activity.createdAt)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-2">暂无活动记录</p>
                    <p className="text-xs text-gray-400">开始创作后这里会显示您的活动</p>
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <Link to="/novels" className="text-sm text-purple-600 hover:text-purple-500 font-medium flex items-center">
                    查看全部活动
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </Card>
            </motion.div>
          </div>

          {/* 快速操作 */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="p-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">快速操作</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link to="/novels/create">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button className="w-full h-20 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex flex-col items-center space-y-2 text-gray-100">
                        <Plus className="w-6 h-6" />
                        <span className="text-lg font-semibold">创建新小说</span>
                      </div>
                    </Button>
                  </motion.div>
                </Link>
                
                <Link to="/novels">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button variant="outline" className="w-full h-20 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex flex-col items-center space-y-2">
                        <BookOpen className="w-6 h-6 text-gray-600" />
                        <span className="text-lg font-semibold text-gray-700">管理小说</span>
                      </div>
                    </Button>
                  </motion.div>
                </Link>
                
                <Link to="/chat">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button variant="outline" className="w-full h-20 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex flex-col items-center space-y-2">
                        <Zap className="w-6 h-6 text-gray-600" />
                        <span className="text-lg font-semibold text-gray-700">AI 助手</span>
                      </div>
                    </Button>
                  </motion.div>
                </Link>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* 目标设置模态框 */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">设置写作目标</h3>
              <button
                onClick={() => setShowGoalModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每日目标（字数）
                </label>
                <input
                  type="number"
                  value={goalForm.dailyGoal}
                  onChange={(e) => setGoalForm({ ...goalForm, dailyGoal: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每周目标（字数）
                </label>
                <input
                  type="number"
                  value={goalForm.weeklyGoal}
                  onChange={(e) => setGoalForm({ ...goalForm, weeklyGoal: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  每月目标（字数）
                </label>
                <input
                  type="number"
                  value={goalForm.monthlyGoal}
                  onChange={(e) => setGoalForm({ ...goalForm, monthlyGoal: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => setShowGoalModal(false)}
                variant="outline"
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleSetGoals}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                保存目标
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Home

