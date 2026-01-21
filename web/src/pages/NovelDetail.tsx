import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit, Trash2, BookOpen, FileText, Users, Map, Sparkles, Loader2, Settings, BarChart3 } from 'lucide-react'
import { novelsApi, type Novel, type Volume, type Chapter, type Character, type PlotPoint } from '@/api/novels'
import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import SimpleTabs from '@/components/UI/SimpleTabs'
import Input from '@/components/UI/Input'
import Textarea from '@/components/UI/Textarea'
import StorylineTab from '@/components/Storyline/StorylineTab'
import SettingTab from '@/components/Setting/SettingTab'
import toast from 'react-hot-toast'

// 字数统计工具函数
const countWords = (text: string): number => {
  if (!text) return 0
  // 计算中文字符数（去除空格、标点等）
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || []
  // 计算英文单词数
  const englishWords = text.match(/[a-zA-Z]+/g) || []
  return chineseChars.length + englishWords.length
}

export default function NovelDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [volumes, setVolumes] = useState<Volume[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [characters, setCharacters] = useState<Character[]>([])
  const [plotPoints, setPlotPoints] = useState<PlotPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chapters' | 'volumes' | 'characters' | 'plot' | 'storyline' | 'setting'>('chapters')
  
  // 字数统计
  const [totalWordCount, setTotalWordCount] = useState(0)
  
  // 角色表单
  const [showCharacterForm, setShowCharacterForm] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [characterForm, setCharacterForm] = useState({ name: '', description: '' })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiEnhancing, setAiEnhancing] = useState(false)
  
  // 情节表单
  const [showPlotForm, setShowPlotForm] = useState(false)
  const [editingPlot, setEditingPlot] = useState<PlotPoint | null>(null)
  const [plotForm, setPlotForm] = useState({ title: '', content: '' })
  const [aiGeneratingPlot, setAiGeneratingPlot] = useState(false)
  const [aiEnhancingPlot, setAiEnhancingPlot] = useState(false)

  useEffect(() => {
    if (id) {
      loadNovel()
      loadChapters()
      loadVolumes()
      loadCharacters()
      loadPlotPoints()
    }
  }, [id])

  const loadNovel = async () => {
    if (!id) return
    try {
      const response = await novelsApi.getNovel(Number(id))
      if (response.code === 200) {
        setNovel(response.data)
      } else {
        toast.error(response.msg || '加载失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadChapters = async () => {
    if (!id) return
    try {
      const response = await novelsApi.queryChapters(Number(id))
      if (response.code === 200) {
        const chaptersData = response.data?.items || []
        setChapters(chaptersData)
        
        // 计算总字数
        const totalWords = chaptersData.reduce((total, chapter) => {
          if (chapter.content) {
            // 计算中文字符数（去除空格、标点等）
            const chineseChars = chapter.content.match(/[\u4e00-\u9fa5]/g) || []
            // 计算英文单词数
            const englishWords = chapter.content.match(/[a-zA-Z]+/g) || []
            return total + chineseChars.length + englishWords.length
          }
          return total
        }, 0)
        setTotalWordCount(totalWords)
      }
    } catch (error: any) {
      console.error('Failed to load chapters:', error)
    }
  }

  const loadVolumes = async () => {
    if (!id) return
    try {
      const response = await novelsApi.queryVolumes(Number(id))
      if (response.code === 200) {
        setVolumes(response.data?.items || [])
      }
    } catch (error: any) {
      console.error('Failed to load volumes:', error)
    }
  }

  const loadCharacters = async () => {
    if (!id) return
    try {
      const response = await novelsApi.queryCharacters(Number(id))
      if (response.code === 200) {
        setCharacters(response.data?.items || [])
      }
    } catch (error: any) {
      console.error('Failed to load characters:', error)
    }
  }

  const loadPlotPoints = async () => {
    if (!id) return
    try {
      const response = await novelsApi.queryPlotPoints(Number(id))
      if (response.code === 200) {
        setPlotPoints(response.data?.items || [])
      }
    } catch (error: any) {
      console.error('Failed to load plot points:', error)
    }
  }

  const handleDeleteChapter = async (chapterId: number) => {
    if (!confirm('确定要删除这个章节吗？')) return
    try {
      const response = await novelsApi.deleteChapter(chapterId)
      if (response.code === 200) {
        toast.success('删除成功')
        loadChapters() // 重新加载章节并计算字数
      } else {
        toast.error(response.msg || '删除失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '删除失败')
    }
  }

  // 角色相关操作
  const handleCreateCharacter = () => {
    setEditingCharacter(null)
    setCharacterForm({ name: '', description: '' })
    setShowCharacterForm(true)
  }

  const handleEditCharacter = (character: Character) => {
    setEditingCharacter(character)
    setCharacterForm({ name: character.name, description: character.description || '' })
    setShowCharacterForm(true)
  }

  const handleAIGenerate = async () => {
    if (!characterForm.name.trim()) {
      toast.error('请先输入角色名称')
      return
    }

    setAiGenerating(true)
    try {
      const response = await novelsApi.generateCharacter({
        name: characterForm.name,
        novelTitle: novel?.title,
        novelGenre: novel?.genre,
        // 如果有世界观设定，作为背景参考
        background: novel?.worldSetting ? `小说世界观：${novel.worldSetting}` : undefined,
      })

      if (response.code === 200) {
        const aiResult = response.data
        // 组合所有生成的内容
        const fullDescription = `${aiResult.description}\n\n【性格特点】\n${aiResult.personality}\n\n【背景故事】\n${aiResult.background}\n\n【外貌描述】\n${aiResult.appearance}\n\n【技能特长】\n${aiResult.skills}\n\n【目标动机】\n${aiResult.goals}\n\n【弱点缺陷】\n${aiResult.weaknesses}`
        
        setCharacterForm({
          ...characterForm,
          description: fullDescription
        })
        toast.success('AI 生成成功！')
      } else {
        toast.error(response.msg || 'AI 生成失败')
      }
    } catch (error: any) {
      toast.error(error.msg || 'AI 生成失败')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAIEnhance = async () => {
    if (!characterForm.name.trim() || !characterForm.description.trim()) {
      toast.error('请先输入角色名称和描述')
      return
    }

    setAiEnhancing(true)
    try {
      const response = await novelsApi.enhanceDescription({
        name: characterForm.name,
        description: characterForm.description,
      })

      if (response.code === 200) {
        setCharacterForm({
          ...characterForm,
          description: response.data.description
        })
        toast.success('AI 增强成功！')
      } else {
        toast.error(response.msg || 'AI 增强失败')
      }
    } catch (error: any) {
      toast.error(error.msg || 'AI 增强失败')
    } finally {
      setAiEnhancing(false)
    }
  }

  const handleSaveCharacter = async () => {
    if (!characterForm.name.trim()) {
      toast.error('请输入角色名称')
      return
    }

    try {
      if (editingCharacter) {
        const response = await novelsApi.updateCharacter(editingCharacter.id, characterForm)
        if (response.code === 200) {
          toast.success('更新成功')
          setShowCharacterForm(false)
          loadCharacters()
        } else {
          toast.error(response.msg || '更新失败')
        }
      } else {
        const response = await novelsApi.createCharacter({
          novelId: Number(id),
          ...characterForm
        })
        if (response.code === 200) {
          toast.success('创建成功')
          setShowCharacterForm(false)
          loadCharacters()
        } else {
          toast.error(response.msg || '创建失败')
        }
      }
    } catch (error: any) {
      toast.error(error.msg || '操作失败')
    }
  }

  const handleDeleteCharacter = async (characterId: number) => {
    if (!confirm('确定要删除这个角色吗？')) return
    try {
      const response = await novelsApi.deleteCharacter(characterId)
      if (response.code === 200) {
        toast.success('删除成功')
        loadCharacters()
      } else {
        toast.error(response.msg || '删除失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '删除失败')
    }
  }

  // 情节相关操作
  const handleCreatePlot = () => {
    setEditingPlot(null)
    setPlotForm({ title: '', content: '' })
    setShowPlotForm(true)
  }

  const handleEditPlot = (plot: PlotPoint) => {
    setEditingPlot(plot)
    setPlotForm({ title: plot.title, content: plot.content || '' })
    setShowPlotForm(true)
  }

  const handleAIGeneratePlot = async () => {
    if (!plotForm.title.trim()) {
      toast.error('请先输入情节标题')
      return
    }

    setAiGeneratingPlot(true)
    try {
      const response = await novelsApi.generatePlot({
        title: plotForm.title,
        novelTitle: novel?.title,
        novelGenre: novel?.genre,
        worldSetting: novel?.worldSetting,
      })

      if (response.code === 200) {
        const aiResult = response.data
        const fullContent = `${aiResult.content}\n\n【情节摘要】\n${aiResult.summary}\n\n【冲突点】\n${aiResult.conflict}\n\n【发展方向】\n${aiResult.development}\n\n【涉及角色】\n${aiResult.characters}\n\n【影响和后果】\n${aiResult.impact}`
        
        setPlotForm({
          ...plotForm,
          content: fullContent
        })
        toast.success('AI 生成成功！')
      } else {
        toast.error(response.msg || 'AI 生成失败')
      }
    } catch (error: any) {
      toast.error(error.msg || 'AI 生成失败')
    } finally {
      setAiGeneratingPlot(false)
    }
  }

  const handleAIEnhancePlot = async () => {
    if (!plotForm.title.trim() || !plotForm.content.trim()) {
      toast.error('请先输入情节标题和内容')
      return
    }

    setAiEnhancingPlot(true)
    try {
      const response = await novelsApi.enhancePlotContent({
        title: plotForm.title,
        content: plotForm.content,
      })

      if (response.code === 200) {
        setPlotForm({
          ...plotForm,
          content: response.data.content
        })
        toast.success('AI 增强成功！')
      } else {
        toast.error(response.msg || 'AI 增强失败')
      }
    } catch (error: any) {
      toast.error(error.msg || 'AI 增强失败')
    } finally {
      setAiEnhancingPlot(false)
    }
  }

  const handleSavePlot = async () => {
    if (!plotForm.title.trim()) {
      toast.error('请输入情节标题')
      return
    }

    try {
      if (editingPlot) {
        const response = await novelsApi.updatePlotPoint(editingPlot.id, plotForm)
        if (response.code === 200) {
          toast.success('更新成功')
          setShowPlotForm(false)
          loadPlotPoints()
        } else {
          toast.error(response.msg || '更新失败')
        }
      } else {
        const response = await novelsApi.createPlotPoint({
          novelId: Number(id),
          ...plotForm
        })
        if (response.code === 200) {
          toast.success('创建成功')
          setShowPlotForm(false)
          loadPlotPoints()
        } else {
          toast.error(response.msg || '创建失败')
        }
      }
    } catch (error: any) {
      toast.error(error.msg || '操作失败')
    }
  }

  const handleDeletePlot = async (plotId: number) => {
    if (!confirm('确定要删除这个情节吗？')) return
    try {
      const response = await novelsApi.deletePlotPoint(plotId)
      if (response.code === 200) {
        toast.success('删除成功')
        loadPlotPoints()
      } else {
        toast.error(response.msg || '删除失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '删除失败')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  if (!novel) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">小说不存在</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/novels')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            className="mb-4"
          >
            返回列表
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {novel.title}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 rounded text-sm ${
                  novel.status === 'published' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {novel.status === 'published' ? '已发布' : '草稿'}
                </span>
                {novel.genre && (
                  <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {novel.genre}
                  </span>
                )}
                <span className="px-2 py-1 rounded text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  总字数: {totalWordCount.toLocaleString()}
                </span>
                <span className="px-2 py-1 rounded text-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  章节数: {chapters.length}
                </span>
              </div>
              
              {novel.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">简介</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {novel.description}
                  </p>
                </div>
              )}
              
              {novel.worldSetting && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">世界观设定</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {novel.worldSetting}
                  </p>
                </div>
              )}
              
              {novel.tags && (
                <div className="flex flex-wrap gap-2">
                  {novel.tags.split(',').map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/novels/${id}/edit`)}
                leftIcon={<Edit className="w-4 h-4" />}
              >
                编辑
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(`/novels/${id}/storylines`)}
                leftIcon={<Map className="w-4 h-4" />}
              >
                故事线
              </Button>
              <Button
                onClick={() => navigate(`/novels/${id}/chapters/create`)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                新建章节
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Card className="p-6">
          <SimpleTabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as any)}
            items={[
              { value: 'chapters', label: '章节' },
              { value: 'volumes', label: '卷' },
              { value: 'characters', label: '角色' },
              { value: 'plot', label: '情节' },
              { value: 'storyline', label: '故事线' },
              { value: 'setting', label: '设定' },
            ]}
          />

          <div className="mt-6">
            {activeTab === 'chapters' && (
              <div>
                {chapters.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">还没有章节</p>
                    <Button onClick={() => navigate(`/novels/${id}/chapters/create`)} leftIcon={<Plus className="w-4 h-4" />}>
                      创建章节
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            第 {chapter.order} 章
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {chapter.title}
                          </span>
                          <span className="text-xs text-gray-400">
                            {chapter.content ? (() => {
                              const chineseChars = chapter.content.match(/[\u4e00-\u9fa5]/g) || []
                              const englishWords = chapter.content.match(/[a-zA-Z]+/g) || []
                              const wordCount = chineseChars.length + englishWords.length
                              return `${wordCount.toLocaleString()}字`
                            })() : '0字'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/novels/${id}/chapters/${chapter.id}`)}
                          >
                            查看
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/novels/${id}/chapters/${chapter.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'volumes' && (
              <div>
                {volumes.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">还没有卷</p>
                    <Button onClick={() => navigate(`/novels/${id}/volumes/create`)} leftIcon={<Plus className="w-4 h-4" />}>
                      创建卷
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {volumes.map((volume) => (
                      <div
                        key={volume.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                          {volume.title}
                        </h3>
                        {volume.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {volume.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'characters' && (
              <div>
                {showCharacterForm ? (
                  <Card className="p-6 mb-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingCharacter ? '编辑角色' : '创建角色'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">角色名称</label>
                        <Input
                          value={characterForm.name}
                          onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                          placeholder="输入角色名称"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">角色描述</label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleAIGenerate}
                              disabled={aiGenerating || !characterForm.name.trim()}
                              leftIcon={aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            >
                              {aiGenerating ? 'AI 生成中...' : 'AI 生成'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleAIEnhance}
                              disabled={aiEnhancing || !characterForm.description.trim()}
                              leftIcon={aiEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            >
                              {aiEnhancing ? 'AI 增强中...' : 'AI 增强'}
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={characterForm.description}
                          onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                          placeholder="输入角色描述、性格、背景等，或使用 AI 生成"
                          rows={12}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          提示：先输入角色名称，然后点击"AI 生成"自动创建完整的角色设定
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveCharacter}>保存</Button>
                        <Button variant="outline" onClick={() => setShowCharacterForm(false)}>取消</Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="mb-4">
                    <Button onClick={handleCreateCharacter} leftIcon={<Plus className="w-4 h-4" />}>
                      添加角色
                    </Button>
                  </div>
                )}

                {characters.length === 0 && !showCharacterForm ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">还没有角色</p>
                    <Button onClick={handleCreateCharacter} leftIcon={<Plus className="w-4 h-4" />}>
                      添加角色
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {characters.map((character) => (
                      <Card key={character.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {character.name}
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCharacter(character)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCharacter(character.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {character.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {character.description}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'plot' && (
              <div>
                {showPlotForm ? (
                  <Card className="p-6 mb-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingPlot ? '编辑情节' : '创建情节'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">情节标题</label>
                        <Input
                          value={plotForm.title}
                          onChange={(e) => setPlotForm({ ...plotForm, title: e.target.value })}
                          placeholder="输入情节标题"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium">情节内容</label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleAIGeneratePlot}
                              disabled={aiGeneratingPlot || !plotForm.title.trim()}
                              leftIcon={aiGeneratingPlot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            >
                              {aiGeneratingPlot ? 'AI 生成中...' : 'AI 生成'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleAIEnhancePlot}
                              disabled={aiEnhancingPlot || !plotForm.content.trim()}
                              leftIcon={aiEnhancingPlot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            >
                              {aiEnhancingPlot ? 'AI 增强中...' : 'AI 增强'}
                            </Button>
                          </div>
                        </div>
                        <Textarea
                          value={plotForm.content}
                          onChange={(e) => setPlotForm({ ...plotForm, content: e.target.value })}
                          placeholder="输入情节详细内容、发展方向等，或使用 AI 生成"
                          rows={12}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          提示：先输入情节标题，然后点击"AI 生成"自动创建完整的情节设定
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSavePlot}>保存</Button>
                        <Button variant="outline" onClick={() => setShowPlotForm(false)}>取消</Button>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="mb-4">
                    <Button onClick={handleCreatePlot} leftIcon={<Plus className="w-4 h-4" />}>
                      添加情节
                    </Button>
                  </div>
                )}

                {plotPoints.length === 0 && !showPlotForm ? (
                  <div className="text-center py-12">
                    <Map className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">还没有情节</p>
                    <Button onClick={handleCreatePlot} leftIcon={<Plus className="w-4 h-4" />}>
                      添加情节
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {plotPoints.map((plot) => (
                      <Card key={plot.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                            {plot.title}
                          </h3>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPlot(plot)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlot(plot.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {plot.content && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {plot.content}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'storyline' && (
              <StorylineTab
                novelId={Number(id)}
                novelTitle={novel?.title}
                novelGenre={novel?.genre}
                worldSetting={novel?.worldSetting}
              />
            )}

            {activeTab === 'setting' && (
              <SettingTab
                novelId={Number(id)}
                novelTitle={novel?.title}
                novelGenre={novel?.genre}
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

