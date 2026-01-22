import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout/Layout'
import Card from '@/components/UI/Card'
import Button from '@/components/UI/Button'
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
      totalNovels: 5,
      totalChapters: 42,
      totalWords: 125680,
      todayWords: 2340,
      weeklyWords: 15600,
      monthlyWords: 68900,
      todayChapters: 1,
      weeklyChapters: 8,
      recentActivity: [
        { id: '1', type: 'chapter', title: '第十五章：命运的转折', time: '1小时前' },
        { id: '2', type: 'edit', title: '优化了《星辰征途》的人物设定', time: '3小时前' },
        { id: '3', type: 'chapter', title: '第十四章：黎明前的黑暗', time: '昨天' },
        { id: '4', type: 'novel', title: '开始创作新小说《时空漫游者》', time: '2天前' },
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
                      <div className="flex items-center space-x-2">
                        <Target className="w-5 h-5" />
                        <span>今日目标：2000字</span>
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
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">总小说数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalNovels}</p>
                  <p className="text-xs text-green-600 mt-1">+2 本月</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                  <BookOpen className="w-6 h-6 text-gray-900" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">总章节数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalChapters}</p>
                  <p className="text-xs text-green-600 mt-1">+{stats.weeklyChapters} 本周</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg">
                  <FileText className="w-6 h-6 text-gray-900" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">总字数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalWords.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">+{stats.weeklyWords.toLocaleString()} 本周</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                  <BarChart3 className="w-6 h-6 text-gray-900" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">今日字数</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.todayWords.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">目标：2000字</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-gray-900" />
                </div>
              </div>
            </Card>
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
                    <span className="text-sm">本月目标</span>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-medium text-gray-700">今日进度</span>
                      <span className="text-sm text-gray-500">{stats.todayWords} / 2000 字</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <motion.div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full" 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.todayWords / 2000) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-medium text-gray-700">本周进度</span>
                      <span className="text-sm text-gray-500">{stats.weeklyWords.toLocaleString()} / 15000 字</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <motion.div 
                        className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full" 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.weeklyWords / 15000) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.7 }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-base font-medium text-gray-700">本月进度</span>
                      <span className="text-sm text-gray-500">{stats.monthlyWords.toLocaleString()} / 80000 字</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <motion.div 
                        className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full" 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stats.monthlyWords / 80000) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: 0.9 }}
                      />
                    </div>
                  </div>
                </div>

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
                      <p className="text-3xl font-bold text-purple-600">86%</p>
                      <p className="text-sm text-gray-600">完成度</p>
                    </div>
                  </div>
                </div>
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
                
                <div className="space-y-4">
                  {stats.recentActivity.map((activity, index) => (
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
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

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
    </Layout>
  )
}

export default Home

