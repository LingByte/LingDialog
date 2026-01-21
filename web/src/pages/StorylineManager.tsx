import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, Edit2, Trash2, Search, FileText, Grid3x3, List, 
  GitBranch, X, ChevronRight, AlertCircle, Sparkles, Globe, Calendar, 
  Webhook, Bot, Copy, Check, History, RotateCcw, GitCompare, Eye, EyeOff,
  MoreVertical, Save, Layers, Target, Users, BookOpen, Zap, Settings
} from 'lucide-react'
import { storylineApi, novelsApi, type StorylineWithStats, type Novel, type Storyline } from '@/api/novels'
import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import Badge from '@/components/UI/Badge'
import Input from '@/components/UI/Input'
import Modal from '@/components/UI/Modal'
import EmptyState from '@/components/UI/EmptyState'
import StorylineCanvas from '@/components/Storyline/StorylineCanvas'
import AIGenerateDialog from '@/components/Storyline/AIGenerateDialog'
import toast from 'react-hot-toast'

type StorylineStatus = 'active' | 'completed' | 'paused'
type StorylineType = 'main' | 'character' | 'plot' | 'theme'

const StorylineManager: React.FC = () => {
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [storylines, setStorylines] = useState<StorylineWithStats[]>([])
  const [filteredStorylines, setFilteredStorylines] = useState<StorylineWithStats[]>([])
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStoryline, setSelectedStoryline] = useState<StorylineWithStats | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStoryline, setEditingStoryline] = useState<StorylineWithStats | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'canvas'>('grid')
  const [showProperties, setShowProperties] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [visibleStorylines, setVisibleStorylines] = useState<Set<number>>(new Set())

  // 加载数据
  useEffect(() => {
    if (novelId) {
      loadData()
    }
  }, [novelId])

  // 过滤和搜索
  useEffect(() => {
    let filtered = storylines

    if (selectedType !== 'all') {
      filtered = filtered.filter(s => s.type === selectedType)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.status === selectedStatus)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(term) ||
        s.description?.toLowerCase().includes(term)
      )
    }

    setFilteredStorylines(filtered)
  }, [storylines, selectedType, selectedStatus, searchTerm])

  const loadData = async () => {
    if (!novelId) return
    
    setLoading(true)
    setError(null)
    
    try {
      // 并行加载小说信息和故事线
      const [novelResponse, storylinesResponse] = await Promise.all([
        novelsApi.getNovel(Number(novelId)),
        storylineApi.getStorylines(Number(novelId))
      ])
      
      if (novelResponse.code === 200) {
        setNovel(novelResponse.data)
      } else {
        setError(novelResponse.msg || '加载小说信息失败')
      }
      
      if (storylinesResponse.code === 200) {
        setStorylines(storylinesResponse.data)
        // 默认显示所有故事线
        const allIds = new Set(storylinesResponse.data.map(s => s.id))
        setVisibleStorylines(allIds)
      } else {
        setError(storylinesResponse.msg || '加载故事线失败')
      }
    } catch (err: any) {
      setError(err.msg || err.message || '加载数据失败')
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingStoryline(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (storyline: StorylineWithStats) => {
    setEditingStoryline(storyline)
    setIsEditModalOpen(true)
  }

  const handleSelectStoryline = (storyline: StorylineWithStats) => {
    setSelectedStoryline(storyline)
    setViewMode('canvas')
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这条故事线吗？此操作不可恢复。')) {
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await storylineApi.deleteStoryline(id)
      if (response.code === 200) {
        setStorylines(prev => prev.filter(s => s.id !== id))
        if (selectedStoryline?.id === id) {
          setSelectedStoryline(null)
        }
        toast.success('故事线删除成功')
      } else {
        setError(response.msg || '删除故事线失败')
      }
    } catch (err: any) {
      setError(err.msg || err.message || '删除故事线失败')
      console.error('Failed to delete storyline:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (storylineData: Partial<StorylineWithStats>) => {
    setSaving(true)
    setError(null)
    
    try {
      if (editingStoryline) {
        // 更新故事线
        const response = await storylineApi.updateStoryline(editingStoryline.id, storylineData)
        if (response.code === 200) {
          setStorylines(prev => prev.map(s => s.id === editingStoryline.id ? response.data : s))
          if (selectedStoryline?.id === editingStoryline.id) {
            setSelectedStoryline(response.data)
          }
          setIsEditModalOpen(false)
          toast.success('故事线更新成功')
        } else {
          setError(response.msg || '更新故事线失败')
        }
      } else {
        // 创建故事线
        if (!storylineData.title) {
          setError('标题是必填项')
          return
        }

        const response = await storylineApi.createStoryline({
          ...storylineData,
          novelId: Number(novelId),
        })
        
        if (response.code === 200) {
          setStorylines(prev => [response.data, ...prev])
          setIsCreateModalOpen(false)
          toast.success('故事线创建成功')
        } else {
          setError(response.msg || '创建故事线失败')
        }
      }
    } catch (err: any) {
      setError(err.msg || err.message || '保存故事线失败')
      console.error('Failed to save storyline:', err)
    } finally {
      setSaving(false)
    }
    
    setEditingStoryline(null)
  }

  const handleAIGenerate = async (generateData: any) => {
    try {
      const response = await storylineApi.generateStorylines({
        novelId: Number(novelId),
        novelTitle: novel?.title,
        novelGenre: novel?.genre,
        worldSetting: novel?.worldSetting,
        ...generateData,
      })
      
      if (response.code === 200) {
        // 创建生成的故事线
        for (const generatedStoryline of response.data.storylines) {
          await handleSave({
            title: generatedStoryline.title,
            description: generatedStoryline.description,
            type: generatedStoryline.type as StorylineType,
            color: generatedStoryline.color,
            priority: generatedStoryline.priority,
            status: 'active' as StorylineStatus,
          })
        }
        
        setShowAIDialog(false)
        toast.success('AI 生成成功')
      } else {
        setError(response.msg || '生成失败')
      }
    } catch (error: any) {
      setError(error.msg || error.message || '生成失败')
    }
  }

  const toggleStorylineVisibility = (storylineId: number) => {
    const newVisible = new Set(visibleStorylines)
    if (newVisible.has(storylineId)) {
      newVisible.delete(storylineId)
    } else {
      newVisible.add(storylineId)
    }
    setVisibleStorylines(newVisible)
  }

  const getStatusBadge = (status: StorylineStatus) => {
    const variants = {
      active: { variant: 'success' as const, label: '进行中' },
      completed: { variant: 'muted' as const, label: '已完成' },
      paused: { variant: 'outline' as const, label: '暂停' }
    }
    const config = variants[status] || variants.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getTypeBadge = (type: StorylineType) => {
    const variants = {
      main: { variant: 'primary' as const, label: '主线', icon: Target },
      character: { variant: 'success' as const, label: '角色线', icon: Users },
      plot: { variant: 'warning' as const, label: '情节线', icon: BookOpen },
      theme: { variant: 'purple' as const, label: '主题线', icon: Layers }
    }
    const config = variants[type] || variants.plot
    const IconComponent = config.icon
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  // 如果选择了故事线且在画布模式，显示画布编辑器
  if (selectedStoryline && viewMode === 'canvas') {
    return (
      <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* 顶部工具栏 */}
        <div className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => setSelectedStoryline(null)}
            >
              返回列表
            </Button>
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
            <div>
              <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
                {selectedStoryline.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedStoryline.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-4 h-4" />}
              onClick={() => handleEdit(selectedStoryline)}
            >
              编辑
            </Button>
            {getStatusBadge(selectedStoryline.status)}
            {getTypeBadge(selectedStoryline.type)}
          </div>
        </div>

        {/* 主内容区域 - 画布 */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative overflow-hidden">
            <StorylineCanvas
              storylines={[selectedStoryline].filter(s => visibleStorylines.has(s.id))}
              selectedStorylineId={selectedStoryline.id}
              onStorylineSelect={() => {}}
              onNodesUpdate={loadData}
            />
          </div>

          {/* 右侧：属性面板 */}
          <AnimatePresence>
            {showProperties && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden flex flex-col"
              >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">属性</h2>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setShowProperties(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        故事线名称
                      </label>
                      <Input size="sm" value={selectedStoryline.title} readOnly />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        描述
                      </label>
                      <textarea
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        rows={3}
                        value={selectedStoryline.description}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        类型和状态
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {getTypeBadge(selectedStoryline.type)}
                        {getStatusBadge(selectedStoryline.status)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        进度
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${selectedStoryline.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedStoryline.progress}%
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>节点数量</span>
                          <span>{selectedStoryline.nodeCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>已完成节点</span>
                          <span>{selectedStoryline.completedNodes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>优先级</span>
                          <span>{selectedStoryline.priority}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>创建时间</span>
                          <span>{formatDate(selectedStoryline.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>更新时间</span>
                          <span>{formatDate(selectedStoryline.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showProperties && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 z-10"
              onClick={() => setShowProperties(true)}
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 列表视图
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate(`/novels/${novelId}`)}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                返回小说
              </Button>
              <div className="flex-1 min-w-0 relative pl-4">
                <motion.div
                  layoutId="pageTitleIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.3 }}
                />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  故事线管理
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {novel?.title} - 管理小说的故事线和情节发展
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm break-words">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                leftIcon={<Grid3x3 className="w-4 h-4" />}
              >
                网格
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                leftIcon={<List className="w-4 h-4" />}
              >
                列表
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIDialog(true)}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                AI 生成
              </Button>
              <Button
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleCreate}
              >
                创建故事线
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6" padding="md">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="搜索故事线..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                clearable
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedType === 'all' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('all')}
              >
                全部类型 ({storylines.length})
              </Button>
              <Button
                variant={selectedType === 'main' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('main')}
              >
                主线 ({storylines.filter(s => s.type === 'main').length})
              </Button>
              <Button
                variant={selectedType === 'character' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('character')}
              >
                角色线 ({storylines.filter(s => s.type === 'character').length})
              </Button>
              <Button
                variant={selectedType === 'plot' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('plot')}
              >
                情节线 ({storylines.filter(s => s.type === 'plot').length})
              </Button>
              <Button
                variant={selectedType === 'theme' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedType('theme')}
              >
                主题线 ({storylines.filter(s => s.type === 'theme').length})
              </Button>
            </div>
          </div>
        </Card>

        {/* Storyline List */}
        {loading && storylines.length === 0 ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-500 mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          </Card>
        ) : filteredStorylines.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="暂无故事线"
            description={searchTerm || selectedType !== 'all' ? "没有找到匹配的故事线" : "创建你的第一条故事线"}
            action={!searchTerm && selectedType === 'all' ? {
              label: '创建故事线',
              onClick: handleCreate
            } : undefined}
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStorylines.map((storyline) => (
              <motion.div
                key={storyline.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  hover
                  onClick={() => handleSelectStoryline(storyline)}
                  className="cursor-pointer h-full"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: storyline.color }}
                        />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                          {storyline.title}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {storyline.description || '无描述'}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex items-center gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStorylineVisibility(storyline.id)
                        }}
                      >
                        {visibleStorylines.has(storyline.id) ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {getTypeBadge(storyline.type)}
                    {getStatusBadge(storyline.status)}
                    <Badge variant="outline" size="xs">
                      优先级 {storyline.priority}
                    </Badge>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>完成进度</span>
                      <span>{storyline.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${storyline.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        <span>{storyline.nodeCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>{storyline.completedNodes}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Edit2 className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(storyline)
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Trash2 className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(storyline.id)
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card padding="none">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredStorylines.map((storyline) => (
                <motion.div
                  key={storyline.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                  className="p-4 cursor-pointer transition-colors"
                  onClick={() => handleSelectStoryline(storyline)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: storyline.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                            {storyline.title}
                          </h3>
                          {getTypeBadge(storyline.type)}
                          {getStatusBadge(storyline.status)}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {storyline.description || '无描述'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{formatDate(storyline.updatedAt)}</span>
                          <span>{storyline.nodeCount} 节点</span>
                          <span>{storyline.completedNodes} 已完成</span>
                          <span>{storyline.progress}% 进度</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStorylineVisibility(storyline.id)
                        }}
                      >
                        {visibleStorylines.has(storyline.id) ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Edit2 className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(storyline)
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        leftIcon={<Trash2 className="w-3 h-3" />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(storyline.id)
                        }}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setIsEditModalOpen(false)
            setEditingStoryline(null)
          }}
          title={editingStoryline ? '编辑故事线' : '创建故事线'}
          size="lg"
        >
          <StorylineForm
            storyline={editingStoryline}
            onSave={handleSave}
            saving={saving}
            onCancel={() => {
              setIsCreateModalOpen(false)
              setIsEditModalOpen(false)
              setEditingStoryline(null)
              setError(null)
            }}
          />
        </Modal>

        {/* AI Generate Dialog */}
        {showAIDialog && (
          <AIGenerateDialog
            novel={novel}
            onGenerate={handleAIGenerate}
            onClose={() => setShowAIDialog(false)}
          />
        )}
      </div>
    </div>
  )
}

// 故事线表单组件
interface StorylineFormProps {
  storyline?: StorylineWithStats | null
  onSave: (data: Partial<StorylineWithStats>) => Promise<void>
  onCancel: () => void
  saving?: boolean
}

const StorylineForm: React.FC<StorylineFormProps> = ({ 
  storyline, 
  onSave, 
  onCancel, 
  saving = false 
}) => {
  const [formData, setFormData] = useState({
    title: storyline?.title || '',
    description: storyline?.description || '',
    type: storyline?.type || 'plot' as StorylineType,
    status: storyline?.status || 'active' as StorylineStatus,
    priority: storyline?.priority || 1,
    color: storyline?.color || '#3B82F6'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="标题"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          描述
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            类型
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as StorylineType })}
          >
            <option value="main">主线</option>
            <option value="character">角色线</option>
            <option value="plot">情节线</option>
            <option value="theme">主题线</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            状态
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as StorylineStatus })}
          >
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="paused">暂停</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            优先级
          </label>
          <input
            type="number"
            min="1"
            max="10"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            颜色
          </label>
          <input
            type="color"
            className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-md"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          取消
        </Button>
        <Button variant="primary" type="submit" loading={saving} disabled={saving}>
          保存
        </Button>
      </div>
    </form>
  )
}

export default StorylineManager