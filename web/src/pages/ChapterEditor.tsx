import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Sparkles, Loader2, FileText, Users, Map as MapIcon } from 'lucide-react'
import { novelsApi, type Chapter, type Novel, type Character, type PlotPoint } from '@/api/novels'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Textarea from '@/components/UI/Textarea'
import Card from '@/components/UI/Card'
import toast from 'react-hot-toast'

export default function ChapterEditor() {
  const { novelId, chapterId } = useParams<{ novelId: string; chapterId?: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [, setChapter] = useState<Chapter | null>(null)
  const [novel, setNovel] = useState<Novel | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [plotPoints, setPlotPoints] = useState<PlotPoint[]>([])
  const [previousChapters, setPreviousChapters] = useState<Chapter[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    order: 1,
    outline: '',
    summary: '', // 添加摘要字段
    characterIds: [] as number[],
    plotPointIds: [] as number[],
  })
  
  // AI 生成相关状态
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiGeneratingOutline, setAiGeneratingOutline] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [aiExpanding, setAiExpanding] = useState(false)
  const [aiGeneratingSummary, setAiGeneratingSummary] = useState(false)
  const [aiGeneratingSuggestions, setAiGeneratingSuggestions] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{
    title: string
    outline: string
    description: string
    type: string
  }>>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null)
  const [suggestionFeedback, setSuggestionFeedback] = useState('') // 对所有建议的整体反馈
  const [feedback, setFeedback] = useState('')
  const [userRequirements, setUserRequirements] = useState('') // 用户对大纲/内容的额外要求
  const [generatedMetadata, setGeneratedMetadata] = useState<any>(null) // 存储 AI 生成的元数据
  const [expandTarget, setExpandTarget] = useState('') // 要扩写的段落
  const [expandHint, setExpandHint] = useState('') // 扩写提示
  const [showExpandPanel, setShowExpandPanel] = useState(false)
  const [aiConfig, setAiConfig] = useState({
    targetWordCount: 2000, // 修改默认字数为2000
    avoidComplete: true,
    focusPoints: [] as string[],
  })

  const isEdit = !!chapterId

  useEffect(() => {
    if (novelId) {
      loadNovel()
      loadCharacters()
      loadPlotPoints()
      loadPreviousChapters()
    }
    if (chapterId) {
      loadChapter()
    }
  }, [chapterId, novelId])

  const loadChapter = async () => {
    if (!chapterId) return
    try {
      setLoading(true)
      const response = await novelsApi.getChapter(Number(chapterId))
      if (response.code === 200) {
        setChapter(response.data)
        setFormData({
          title: response.data.title,
          content: response.data.content,
          order: response.data.order,
          outline: response.data.outline || '',
          summary: response.data.summary || '', // 添加摘要字段
          characterIds: response.data.characterIds ? response.data.characterIds.split(',').map(Number) : [],
          plotPointIds: response.data.plotPointIds ? response.data.plotPointIds.split(',').map(Number) : [],
        })
      } else {
        toast.error(response.msg || '加载失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const loadNovel = async () => {
    if (!novelId) return
    try {
      const response = await novelsApi.getNovel(Number(novelId))
      if (response.code === 200) {
        setNovel(response.data)
      }
    } catch (error: any) {
      console.error('Failed to load novel:', error)
    }
  }

  const loadCharacters = async () => {
    if (!novelId) return
    try {
      const response = await novelsApi.queryCharacters(Number(novelId))
      if (response.code === 200) {
        setCharacters(response.data?.items || [])
      }
    } catch (error: any) {
      console.error('Failed to load characters:', error)
    }
  }

  const loadPlotPoints = async () => {
    if (!novelId) return
    try {
      const response = await novelsApi.queryPlotPoints(Number(novelId))
      if (response.code === 200) {
        setPlotPoints(response.data?.items || [])
      }
    } catch (error: any) {
      console.error('Failed to load plot points:', error)
    }
  }

  const loadPreviousChapters = async () => {
    if (!novelId) return
    try {
      const response = await novelsApi.queryChapters(Number(novelId))
      if (response.code === 200) {
        setPreviousChapters(response.data?.items || [])
      }
    } catch (error: any) {
      console.error('Failed to load previous chapters:', error)
    }
  }

  const handleAIGenerateOutline = async () => {
    if (!formData.title.trim()) {
      toast.error('请先输入章节标题')
      return
    }

    setAiGeneratingOutline(true)
    try {
      // 获取前文摘要 - 获取前面最近的3章摘要
      const recentChapters = previousChapters
        .filter(c => c.order < formData.order && c.summary)
        .sort((a, b) => b.order - a.order) // 按章节顺序倒序
        .slice(0, 3) // 最近3章
        
      const previousSummary = recentChapters.length > 0 
        ? recentChapters
            .reverse() // 恢复正序
            .map(c => `第${c.order}章《${c.title}》: ${c.summary}`)
            .join('\n\n')
        : ''

      const selectedPlots = plotPoints
        .filter(p => formData.plotPointIds.includes(p.id))
        .map(p => `${p.title}: ${p.content}`)

      // 构建请求，包含用户已输入的大纲和额外要求
      let requestTitle = formData.title
      if (userRequirements.trim()) {
        requestTitle += `\n\n【用户要求】\n${userRequirements}`
      }
      if (formData.outline.trim()) {
        requestTitle += `\n\n【当前大纲（请在此基础上优化或扩展）】\n${formData.outline}`
      }

      const response = await novelsApi.generateChapterOutline({
        title: requestTitle,
        novelTitle: novel?.title,
        novelGenre: novel?.genre,
        previousSummary,
        plotPoints: selectedPlots,
        chapterNumber: formData.order,
      })

      if (response.code === 200) {
        setFormData({ ...formData, outline: response.data.outline })
        toast.success('大纲生成成功！')
        setUserRequirements('') // 清空用户要求
      } else {
        toast.error(response.msg || '生成失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '生成失败')
    } finally {
      setAiGeneratingOutline(false)
    }
  }

  const handleAIGenerate = async () => {
    if (!formData.title.trim()) {
      toast.error('请先输入章节标题')
      return
    }

    setAiGenerating(true)
    try {
      // 获取前文摘要 - 获取前面最近的3章摘要
      const recentChapters = previousChapters
        .filter(c => c.order < formData.order && c.summary)
        .sort((a, b) => b.order - a.order) // 按章节顺序倒序
        .slice(0, 3) // 最近3章
        
      const previousSummary = recentChapters.length > 0 
        ? recentChapters
            .reverse() // 恢复正序
            .map(c => `第${c.order}章《${c.title}》: ${c.summary}`)
            .join('\n\n')
        : ''

      const selectedCharacters = characters
        .filter(c => formData.characterIds.includes(c.id))
        .map(c => `${c.name}: ${c.description}`)

      const selectedPlots = plotPoints
        .filter(p => formData.plotPointIds.includes(p.id))
        .map(p => `${p.title}: ${p.content}`)

      // 构建大纲，包含用户的额外要求
      let outline = formData.outline
      if (userRequirements.trim()) {
        outline = `${outline}\n\n【用户额外要求】\n${userRequirements}`
      }
      if (formData.content.trim()) {
        outline = `${outline}\n\n【当前已有内容（请在此基础上继续或优化）】\n${formData.content.substring(0, 500)}...`
      }

      const response = await novelsApi.generateChapter({
        title: formData.title,
        novelTitle: novel?.title,
        novelGenre: novel?.genre,
        worldSetting: novel?.worldSetting,
        styleGuide: (novel as any)?.styleGuide,
        outline: outline,
        characters: selectedCharacters,
        plotPoints: selectedPlots,
        previousSummary,
        chapterNumber: formData.order,
        targetWordCount: aiConfig.targetWordCount,
        avoidComplete: aiConfig.avoidComplete,
        focusPoints: aiConfig.focusPoints,
      })

      if (response.code === 200) {
        // 更新内容
        setFormData({ ...formData, content: response.data.content })
        
        // 保存元数据用于显示
        setGeneratedMetadata({
          summary: response.data.summary,
          keyEvents: response.data.keyEvents,
          characterDev: response.data.characterDev,
          plotProgress: response.data.plotProgress,
          foreshadowing: response.data.foreshadowing,
          nextChapterHint: response.data.nextChapterHint,
        })
        
        toast.success('章节生成成功！')
        setShowAIPanel(false)
        setUserRequirements('') // 清空用户要求
      } else {
        toast.error(response.msg || '生成失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '生成失败')
    } finally {
      setAiGenerating(false)
    }
  }

  const handleAIRefine = async () => {
    if (!formData.content.trim() || !feedback.trim()) {
      toast.error('请输入章节内容和反馈意见')
      return
    }

    setAiRefining(true)
    try {
      const response = await novelsApi.refineChapterContent({
        title: formData.title,
        originalContent: formData.content,
        feedback,
      })

      if (response.code === 200) {
        setFormData({ ...formData, content: response.data.content })
        toast.success('优化成功！')
        setFeedback('')
      } else {
        toast.error(response.msg || '优化失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '优化失败')
    } finally {
      setAiRefining(false)
    }
  }

  const handleAIExpand = async () => {
    if (!expandTarget.trim()) {
      toast.error('请输入要扩写的段落')
      return
    }

    setAiExpanding(true)
    try {
      const response = await novelsApi.expandContent({
        originalContent: formData.content,
        expandTarget: expandTarget,
        expandHint: expandHint || '增加细节描写，丰富情节',
        novelGenre: novel?.genre,
        worldSetting: novel?.worldSetting,
        styleGuide: (novel as any)?.styleGuide,
      })

      if (response.code === 200) {
        // 将扩写后的内容替换原段落
        const newContent = formData.content.replace(expandTarget, response.data.content)
        setFormData({ ...formData, content: newContent })
        toast.success('扩写成功！')
        setExpandTarget('')
        setExpandHint('')
        setShowExpandPanel(false)
      } else {
        toast.error(response.msg || '扩写失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '扩写失败')
    } finally {
      setAiExpanding(false)
    }
  }

  const handleGenerateSummary = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('请先输入章节标题和内容')
      return
    }

    setAiGeneratingSummary(true)
    try {
      const response = await novelsApi.generateChapterSummary({
        title: formData.title,
        content: formData.content,
      })

      if (response.code === 200) {
        // 更新表单中的摘要
        setFormData({ ...formData, summary: response.data.summary })
        toast.success('摘要生成成功！')
      } else {
        toast.error(response.msg || '生成摘要失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '生成摘要失败')
    } finally {
      setAiGeneratingSummary(false)
    }
  }

  const handleGenerateSuggestions = async () => {
    setAiGeneratingSuggestions(true)
    try {
      // 获取前文摘要 - 获取前面最近的3章摘要
      const recentChapters = previousChapters
        .filter(c => c.order < formData.order && c.summary)
        .sort((a, b) => b.order - a.order) // 按章节顺序倒序
        .slice(0, 3) // 最近3章
        
      const previousSummary = recentChapters.length > 0 
        ? recentChapters
            .reverse() // 恢复正序
            .map(c => `第${c.order}章《${c.title}》: ${c.summary}`)
            .join('\n\n')
        : ''

      const response = await novelsApi.generateChapterSuggestions({
        novelTitle: novel?.title || '',
        novelGenre: novel?.genre,
        worldSetting: novel?.worldSetting,
        previousSummary,
        chapterNumber: formData.order,
      })

      if (response.code === 200) {
        if (response.data && response.data.suggestions && Array.isArray(response.data.suggestions)) {
          setSuggestions(response.data.suggestions)
          setShowSuggestionsPanel(true)
          toast.success(`章节建议生成成功！共${response.data.suggestions.length}个建议`)
        } else {
          console.error('Invalid suggestions format:', response.data)
          toast.error('建议数据格式错误')
        }
      } else {
        toast.error(response.msg || '生成建议失败')
      }
    } catch (error: any) {
      console.error('Generate suggestions error:', error)
      toast.error(error.msg || error.message || '生成建议失败')
    } finally {
      setAiGeneratingSuggestions(false)
    }
  }

  const handleSelectSuggestion = (index: number) => {
    const suggestion = suggestions[index]
    setSelectedSuggestion(index)
    setFormData({
      ...formData,
      title: suggestion.title,
      outline: suggestion.outline,
    })
    setShowSuggestionsPanel(false)
    setSuggestionFeedback('')
    toast.success('已选择建议，可以继续生成内容')
  }

  const handleSubmitSuggestionFeedback = async () => {
    if (!suggestionFeedback.trim()) {
      toast.error('请输入反馈内容')
      return
    }

    try {
      setAiGeneratingSuggestions(true)
      
      // 获取前文摘要
      const recentChapters = previousChapters
        .filter(c => c.order < formData.order && c.summary)
        .sort((a, b) => b.order - a.order)
        .slice(0, 3)
        
      const previousSummary = recentChapters.length > 0 
        ? recentChapters
            .reverse()
            .map(c => `第${c.order}章《${c.title}》: ${c.summary}`)
            .join('\n\n')
        : ''

      // 构建包含反馈的请求
      const feedbackContext = `
用户对当前所有建议的反馈：${suggestionFeedback}

请根据用户反馈重新生成改进的建议，确保新建议能够解决用户提出的问题。
`

      const response = await novelsApi.generateChapterSuggestions({
        novelTitle: novel?.title || '',
        novelGenre: novel?.genre,
        worldSetting: novel?.worldSetting,
        previousSummary: previousSummary + '\n\n' + feedbackContext,
        chapterNumber: formData.order,
      })

      if (response.code === 200) {
        if (response.data && response.data.suggestions && Array.isArray(response.data.suggestions)) {
          setSuggestions(response.data.suggestions)
          setSuggestionFeedback('')
          toast.success(`根据反馈重新生成了${response.data.suggestions.length}个建议`)
        } else {
          toast.error('建议数据格式错误')
        }
      } else {
        toast.error(response.msg || '重新生成建议失败')
      }
    } catch (error: any) {
      toast.error(error.msg || error.message || '重新生成建议失败')
    } finally {
      setAiGeneratingSuggestions(false)
    }
  }

  const handleRegenerateSuggestions = async () => {
    try {
      setAiGeneratingSuggestions(true)
      
      // 获取前文摘要
      const recentChapters = previousChapters
        .filter(c => c.order < formData.order && c.summary)
        .sort((a, b) => b.order - a.order)
        .slice(0, 3)
        
      const previousSummary = recentChapters.length > 0 
        ? recentChapters
            .reverse()
            .map(c => `第${c.order}章《${c.title}》: ${c.summary}`)
            .join('\n\n')
        : ''

      // 添加"换一批"的提示
      const regenerateContext = `
请生成与之前不同的章节发展方向，提供更多样化的选择。
避免重复之前的建议类型和情节发展。
`

      const response = await novelsApi.generateChapterSuggestions({
        novelTitle: novel?.title || '',
        novelGenre: novel?.genre,
        worldSetting: novel?.worldSetting,
        previousSummary: previousSummary + '\n\n' + regenerateContext,
        chapterNumber: formData.order,
      })

      if (response.code === 200) {
        if (response.data && response.data.suggestions && Array.isArray(response.data.suggestions)) {
          setSuggestions(response.data.suggestions)
          setSuggestionFeedback('') // 清空反馈
          toast.success(`换一批成功！生成了${response.data.suggestions.length}个新建议`)
        } else {
          toast.error('建议数据格式错误')
        }
      } else {
        toast.error(response.msg || '换一批失败')
      }
    } catch (error: any) {
      toast.error(error.msg || error.message || '换一批失败')
    } finally {
      setAiGeneratingSuggestions(false)
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入章节标题')
      return
    }

    try {
      setSaving(true)
      
      const chapterData = {
        title: formData.title,
        content: formData.content,
        order: formData.order,
        outline: formData.outline,
        summary: formData.summary, // 添加摘要字段
        characterIds: formData.characterIds.join(','),
        plotPointIds: formData.plotPointIds.join(','),
      }
      
      if (isEdit && chapterId) {
        const response = await novelsApi.updateChapter(Number(chapterId), chapterData)
        if (response.code === 200) {
          toast.success('保存成功')
          // 重新加载前文摘要以更新显示
          await loadPreviousChapters()
          navigate(`/novels/${novelId}`)
        } else {
          toast.error(response.msg || '保存失败')
        }
      } else {
        const response = await novelsApi.createChapter({
          novelId: Number(novelId),
          ...chapterData,
        })
        if (response.code === 200) {
          toast.success('创建成功')
          navigate(`/novels/${novelId}`)
        } else {
          toast.error(response.msg || '创建失败')
        }
      }
    } catch (error: any) {
      toast.error(error.msg || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate(`/novels/${novelId}`)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            返回
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAIPanel(!showAIPanel)}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              AI 助手
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              保存
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主编辑区 */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">章节标题 *</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateSuggestions}
                      disabled={aiGeneratingSuggestions}
                      leftIcon={aiGeneratingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    >
                      {aiGeneratingSuggestions ? '生成中...' : 'AI 生成建议'}
                    </Button>
                  </div>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="请输入章节标题，或点击上方按钮让 AI 生成建议"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 如果没有想法，可以让 AI 根据前文生成多个章节建议供选择
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">章节顺序</label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    min={1}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">章节大纲</label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAIGenerateOutline}
                      disabled={aiGeneratingOutline || !formData.title.trim()}
                      leftIcon={aiGeneratingOutline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    >
                      {aiGeneratingOutline ? '生成中...' : 'AI 生成大纲'}
                    </Button>
                  </div>
                  
                  {/* 用户要求输入框 */}
                  <div className="mb-3">
                    <Textarea
                      value={userRequirements}
                      onChange={(e) => setUserRequirements(e.target.value)}
                      placeholder="对大纲/内容的额外要求（可选）&#10;例如：重点描写战斗场面、增加角色内心独白、节奏要快一些..."
                      rows={2}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 提示：AI 会根据你的要求和已输入的内容进行生成或优化
                    </p>
                  </div>
                  
                  <Textarea
                    value={formData.outline}
                    onChange={(e) => setFormData({ ...formData, outline: e.target.value })}
                    placeholder="章节大纲（可选，有助于 AI 生成更准确的内容）"
                    rows={6}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">章节内容</label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAIGenerate}
                        disabled={aiGenerating || !formData.title.trim()}
                        leftIcon={aiGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      >
                        {aiGenerating ? 'AI 生成中...' : 'AI 生成内容'}
                      </Button>
                    </div>
                  </div>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="请输入章节内容，或使用 AI 生成..."
                    className="w-full h-96 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    字数：{formData.content.length}
                  </p>
                  
                  {/* 生成摘要按钮 */}
                  {formData.content.length > 500 && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateSummary}
                        disabled={aiGeneratingSummary}
                        leftIcon={aiGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      >
                        {aiGeneratingSummary ? '生成摘要中...' : '生成章节摘要'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        💡 生成摘要有助于后续章节的连贯性
                      </p>
                    </div>
                  )}
                </div>

                {/* 章节摘要显示和编辑 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">章节摘要</label>
                    {formData.content.length > 500 && !formData.summary && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateSummary}
                        disabled={aiGeneratingSummary}
                        leftIcon={aiGeneratingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      >
                        {aiGeneratingSummary ? '生成中...' : '生成摘要'}
                      </Button>
                    )}
                  </div>
                  <Textarea
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="章节摘要（用于后续章节的上下文参考）"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    摘要将用于后续章节的上下文参考，建议控制在200字以内
                  </p>
                </div>

                {/* AI 优化区域 */}
                {formData.content && (
                  <div className="border-t pt-6 space-y-6">
                    {/* 反馈优化 */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3">AI 优化</h3>
                      <div className="space-y-3">
                        <Textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          placeholder="输入反馈意见，例如：节奏太快了，主角不应该这么快突破..."
                          rows={3}
                        />
                        <Button
                          size="sm"
                          onClick={handleAIRefine}
                          disabled={aiRefining || !feedback.trim()}
                          leftIcon={aiRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        >
                          {aiRefining ? '优化中...' : '根据反馈优化'}
                        </Button>
                      </div>
                    </div>

                    {/* 分段扩写 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">分段扩写</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowExpandPanel(!showExpandPanel)}
                        >
                          {showExpandPanel ? '收起' : '展开'}
                        </Button>
                      </div>
                      
                      {showExpandPanel && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">选择要扩写的段落</label>
                            <Textarea
                              value={expandTarget}
                              onChange={(e) => setExpandTarget(e.target.value)}
                              placeholder="粘贴需要扩写的段落内容..."
                              rows={4}
                              className="text-sm"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              💡 从上方内容中复制一个段落，AI 会对其进行扩写
                            </p>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium mb-1">扩写要求（可选）</label>
                            <Input
                              value={expandHint}
                              onChange={(e) => setExpandHint(e.target.value)}
                              placeholder="例如：增加心理描写、详细描述战斗过程..."
                              className="text-sm"
                            />
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={handleAIExpand}
                            disabled={aiExpanding || !expandTarget.trim()}
                            leftIcon={aiExpanding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          >
                            {aiExpanding ? '扩写中...' : '开始扩写'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 显示 AI 生成的元数据 */}
                {generatedMetadata && (
                  <div className="border-t pt-6">
                    <h3 className="text-sm font-semibold mb-3">AI 生成信息</h3>
                    <div className="space-y-3 text-sm">
                      {generatedMetadata.summary && (
                        <div>
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">章节摘要</div>
                          <div className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {generatedMetadata.summary}
                          </div>
                        </div>
                      )}
                      
                      {generatedMetadata.keyEvents && generatedMetadata.keyEvents.length > 0 && (
                        <div>
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">关键事件</div>
                          <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1">
                            {generatedMetadata.keyEvents.map((event: string, idx: number) => (
                              <li key={idx}>{event}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {generatedMetadata.foreshadowing && (
                        <div>
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">伏笔设置</div>
                          <div className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {generatedMetadata.foreshadowing}
                          </div>
                        </div>
                      )}
                      
                      {generatedMetadata.nextChapterHint && (
                        <div>
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">下章提示</div>
                          <div className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                            {generatedMetadata.nextChapterHint}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 前文摘要 */}
            {previousChapters.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  前文摘要
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {previousChapters
                    .filter(c => c.order < formData.order)
                    .sort((a, b) => b.order - a.order) // 按章节顺序倒序排列，最新的在前
                    .slice(0, 5) // 只显示最近的5章
                    .map((chapter) => (
                      <div key={chapter.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-medium text-gray-900 dark:text-white">
                            第{chapter.order}章: {chapter.title}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {chapter.content?.length || 0}字
                          </span>
                        </div>
                        {chapter.summary ? (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                            {chapter.summary}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 italic">
                            暂无摘要
                          </p>
                        )}
                      </div>
                    ))}
                  {previousChapters.filter(c => c.order < formData.order).length === 0 && (
                    <p className="text-xs text-gray-500">这是第一章，没有前文</p>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500">
                    💡 AI 生成时会自动参考前面章节的摘要，确保故事连贯性
                  </p>
                </div>
              </Card>
            )}

            {/* 参与角色 */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                参与角色
              </h3>
              <div className="space-y-2">
                {characters.map((char) => (
                  <label key={char.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.characterIds.includes(char.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            characterIds: [...formData.characterIds, char.id]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            characterIds: formData.characterIds.filter(id => id !== char.id)
                          })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{char.name}</span>
                  </label>
                ))}
                {characters.length === 0 && (
                  <p className="text-xs text-gray-500">暂无角色</p>
                )}
              </div>
            </Card>

            {/* 涉及情节 */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MapIcon className="w-4 h-4" />
                涉及情节
              </h3>
              <div className="space-y-2">
                {plotPoints.map((plot) => (
                  <label key={plot.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.plotPointIds.includes(plot.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            plotPointIds: [...formData.plotPointIds, plot.id]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            plotPointIds: formData.plotPointIds.filter(id => id !== plot.id)
                          })
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{plot.title}</span>
                  </label>
                ))}
                {plotPoints.length === 0 && (
                  <p className="text-xs text-gray-500">暂无情节</p>
                )}
              </div>
            </Card>

            {/* AI 配置 */}
            {showAIPanel && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  AI 生成配置
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">目标字数</label>
                    <Input
                      type="number"
                      value={aiConfig.targetWordCount}
                      onChange={(e) => setAiConfig({ ...aiConfig, targetWordCount: parseInt(e.target.value) || 2000 })}
                      min={1500}
                      max={3000}
                    />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aiConfig.avoidComplete}
                      onChange={(e) => setAiConfig({ ...aiConfig, avoidComplete: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-xs">避免完结情节</span>
                  </label>
                  <p className="text-xs text-gray-500">
                    勾选后，AI 会避免在本章完结任何情节线，为后续发展留有空间
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* 章节建议选择面板 */}
      {showSuggestionsPanel && suggestions.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-5xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">选择章节发展方向</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateSuggestions}
                  disabled={aiGeneratingSuggestions}
                  leftIcon={aiGeneratingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                >
                  {aiGeneratingSuggestions ? '生成中...' : '换一批'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowSuggestionsPanel(false)
                    setSuggestionFeedback('')
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedSuggestion === index
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleSelectSuggestion(index)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {suggestion.title}
                    </h4>
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                      {suggestion.type}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {suggestion.description}
                  </p>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    <strong>大纲预览：</strong>
                    <div className="mt-1 line-clamp-3">
                      {suggestion.outline.substring(0, 150)}...
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 反馈区域 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  对这些建议有什么意见？
                </label>
                <Textarea
                  value={suggestionFeedback}
                  onChange={(e) => setSuggestionFeedback(e.target.value)}
                  placeholder="例如：这些建议都太平淡了，希望有更激烈的冲突；节奏太快了，希望慢一些；希望增加更多角色互动..."
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 AI 会根据您的反馈重新生成更符合期望的建议
                </p>
              </div>

              <div className="flex gap-3 justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSuggestionsPanel(false)
                    setSuggestionFeedback('')
                  }}
                >
                  取消选择
                </Button>
                
                <Button
                  onClick={handleSubmitSuggestionFeedback}
                  disabled={aiGeneratingSuggestions || !suggestionFeedback.trim()}
                  leftIcon={aiGeneratingSuggestions ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                >
                  {aiGeneratingSuggestions ? '重新生成中...' : '根据反馈重新生成'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

