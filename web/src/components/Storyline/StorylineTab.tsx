import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Sparkles, Loader2, GitBranch, Circle } from 'lucide-react'
import { storylineApi, type Storyline, type StorylineWithStats, type StoryNode } from '@/api/novels'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Textarea from '@/components/UI/Textarea'
import toast from 'react-hot-toast'

interface StorylineTabProps {
  novelId: number
  novelTitle?: string
  novelGenre?: string
  worldSetting?: string
}

interface GenerationProgress {
  stage: string
  progress: number
  message: string
}

export default function StorylineTab({ novelId, novelTitle, novelGenre, worldSetting }: StorylineTabProps) {
  const [storylines, setStorylines] = useState<StorylineWithStats[]>([])
  const [selectedStoryline, setSelectedStoryline] = useState<number | null>(null)
  const [nodes, setNodes] = useState<StoryNode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingStoryline, setEditingStoryline] = useState<Storyline | null>(null)
  const [storylineForm, setStorylineForm] = useState({ title: '', description: '' })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [aiEnhancing, setAiEnhancing] = useState(false)
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiExpandingPart, setAiExpandingPart] = useState(false)
  const [suggestions, setSuggestions] = useState<string>('')
  const [userFeedback, setUserFeedback] = useState<string>('')
  const [expandHint, setExpandHint] = useState<string>('')
  const [selectedText, setSelectedText] = useState<string>('')
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    loadStorylines()
  }, [novelId])

  useEffect(() => {
    if (selectedStoryline) {
      loadNodes(selectedStoryline)
    }
  }, [selectedStoryline])

  const loadStorylines = async () => {
    try {
      setLoading(true)
      const response = await storylineApi.getStorylines(novelId)
      if (response.code === 200) {
        setStorylines(response.data || [])
        if (response.data && response.data.length > 0 && !selectedStoryline) {
          setSelectedStoryline(response.data[0].id)
        }
      }
    } catch (error: any) {
      console.error('Failed to load storylines:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadNodes = async (storylineId: number) => {
    try {
      const response = await storylineApi.getStoryNodes(storylineId)
      if (response.code === 200) {
        setNodes(response.data || [])
      }
    } catch (error: any) {
      console.error('Failed to load nodes:', error)
    }
  }

  const handleAIGenerate = async () => {
    setAiGenerating(true)
    setGenerationProgress({ stage: 'preparing', progress: 10, message: '准备生成参数...' })
    
    try {
      // 模拟进度更新
      setTimeout(() => {
        setGenerationProgress({ stage: 'analyzing', progress: 30, message: '分析小说设定和已有故事线...' })
      }, 500)
      
      setTimeout(() => {
        setGenerationProgress({ stage: 'generating', progress: 50, message: 'AI 正在生成故事线...' })
      }, 1500)
      
      // 收集已有故事线信息
      const existingStorylines = storylines.map(sl => ({
        title: sl.title,
        description: sl.description || '',
      }))
      
      const response = await storylineApi.generateStorylines({
        novelId,
        novelTitle,
        genre: novelGenre,
        worldSetting,
        storylineCount: 3,
        nodesPerLine: 5,
        existingStorylines, // 传递已有故事线
      })

      setGenerationProgress({ stage: 'processing', progress: 80, message: '处理生成结果...' })

      if (response.code === 200 && response.data.storylines) {
        setGenerationProgress({ stage: 'saving', progress: 90, message: '保存故事线...' })
        
        // 创建故事线
        for (const sl of response.data.storylines) {
          await storylineApi.createStoryline({
            novelId,
            title: sl.title,
            description: sl.description,
            status: 'planning',
          })
        }
        
        setGenerationProgress({ stage: 'complete', progress: 100, message: '生成完成！' })
        toast.success(`AI 生成了 ${response.data.storylines.length} 条故事线！`)
        
        setTimeout(() => {
          setGenerationProgress(null)
          loadStorylines()
        }, 1000)
      } else {
        toast.error(response.msg || 'AI 生成失败')
        setGenerationProgress(null)
      }
    } catch (error: any) {
      toast.error(error.msg || 'AI 生成失败')
      setGenerationProgress(null)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleCreateStoryline = () => {
    setEditingStoryline(null)
    setStorylineForm({ title: '', description: '' })
    setShowForm(true)
  }

  const handleEditStoryline = (storyline: Storyline) => {
    setEditingStoryline(storyline)
    setStorylineForm({ title: storyline.title, description: storyline.description || '' })
    setSuggestions('')
    setUserFeedback('')
    setExpandHint('')
    setSelectedText('')
    setShowForm(true)
  }

  const handleAIEnhance = async () => {
    if (!storylineForm.title.trim()) {
      toast.error('请先输入故事线标题')
      return
    }

    setAiEnhancing(true)
    try {
      // 收集已有故事线（排除当前编辑的）
      const existingStorylines = storylines
        .filter(sl => sl.id !== editingStoryline?.id)
        .map(sl => ({ title: sl.title, description: sl.description || '' }))
      
      const requestData = {
        novelId,
        novelTitle,
        genre: novelGenre,
        worldSetting,
        storylineCount: 1,
        nodesPerLine: 8,
        existingStorylines,
        mainConflict: `${storylineForm.title}: ${storylineForm.description}`,
      }
      
      console.log('=== AI 完善请求 ===')
      console.log('请求参数:', requestData)
      
      // 生成详细的节点
      const response = await storylineApi.generateStorylines(requestData)

      console.log('=== AI 完善响应 ===')
      console.log('完整响应:', response)
      console.log('响应代码:', response.code)
      console.log('响应数据:', response.data)

      if (response.code === 200 && response.data && response.data.storylines && response.data.storylines.length > 0) {
        const enhanced = response.data.storylines[0]
        console.log('=== 提取的故事线 ===')
        console.log('标题:', enhanced.title)
        console.log('描述:', enhanced.description)
        console.log('节点数量:', enhanced.nodes?.length || 0)
        console.log('完整对象:', enhanced)
        
        // 构建完整的描述，包含所有节点信息
        let fullDescription = enhanced.description || storylineForm.description
        
        if (enhanced.nodes && enhanced.nodes.length > 0) {
          fullDescription += '\n\n【故事节点】\n'
          enhanced.nodes.forEach((node: any, index: number) => {
            fullDescription += `\n${index + 1}. ${node.title}（章节 ${node.chapterRange}）\n`
            fullDescription += `   ${node.description}\n`
          })
        }
        
        const newTitle = enhanced.title || storylineForm.title
        
        console.log('=== 更新表单 ===')
        console.log('新标题:', newTitle)
        console.log('新描述长度:', fullDescription.length)
        console.log('新描述预览:', fullDescription.substring(0, 200) + '...')
        
        setStorylineForm({
          title: newTitle,
          description: fullDescription,
        })
        
        console.log('=== 表单已更新 ===')
        toast.success(`AI 完善成功！生成了 ${enhanced.nodes?.length || 0} 个故事节点`)
      } else {
        console.error('=== 响应格式错误 ===')
        console.error('响应:', response)
        toast.error(response.msg || 'AI 完善失败：响应格式错误')
      }
    } catch (error: any) {
      console.error('=== AI 完善异常 ===')
      console.error('错误对象:', error)
      console.error('错误消息:', error.message)
      console.error('错误堆栈:', error.stack)
      toast.error(error.msg || error.message || 'AI 完善失败')
    } finally {
      setAiEnhancing(false)
    }
  }

  const handleAISuggest = async () => {
    if (!storylineForm.title.trim() || !storylineForm.description.trim()) {
      toast.error('请先输入故事线标题和描述')
      return
    }

    if (!userFeedback.trim()) {
      toast.error('请输入您的修改意见')
      return
    }

    setAiSuggesting(true)
    try {
      const response = await storylineApi.optimizeStoryline({
        currentDescription: storylineForm.description,
        feedback: userFeedback,
      })

      if (response.code === 200) {
        // 直接用 AI 返回的新描述更新
        setStorylineForm({
          ...storylineForm,
          description: response.data.description,
        })
        setSuggestions(response.data.description)
        setUserFeedback('')
        toast.success('AI 修改成功！内容已更新')
      } else {
        toast.error(response.msg || 'AI 修改失败')
      }
    } catch (error: any) {
      console.error('AI suggest error:', error)
      toast.error(error.msg || 'AI 修改失败')
    } finally {
      setAiSuggesting(false)
    }
  }

  const handleTextSelection = () => {
    if (textareaRef) {
      const start = textareaRef.selectionStart
      const end = textareaRef.selectionEnd
      const selected = storylineForm.description.substring(start, end)
      if (selected.trim()) {
        setSelectedText(selected)
      }
    }
  }

  const handleExpandPart = async () => {
    if (!selectedText.trim()) {
      toast.error('请先在描述框中选中要扩写的文本')
      return
    }

    setAiExpandingPart(true)
    try {
      const response = await storylineApi.expandStorylinePart({
        fullDescription: storylineForm.description,
        selectedText: selectedText,
        expandHint: expandHint.trim() || undefined,
      })

      if (response.code === 200) {
        // 替换选中的文本为扩写后的内容
        const newDescription = storylineForm.description.replace(
          selectedText,
          response.data.expandedText
        )
        
        setStorylineForm({
          ...storylineForm,
          description: newDescription,
        })
        
        setSelectedText('')
        setExpandHint('')
        toast.success('局部扩写成功！')
      } else {
        toast.error(response.msg || '扩写失败')
      }
    } catch (error: any) {
      console.error('AI expand part error:', error)
      toast.error(error.msg || '扩写失败')
    } finally {
      setAiExpandingPart(false)
    }
  }

  const handleSaveStoryline = async () => {
    if (!storylineForm.title.trim()) {
      toast.error('请输入故事线标题')
      return
    }

    try {
      if (editingStoryline) {
        const response = await storylineApi.updateStoryline(editingStoryline.id, storylineForm)
        if (response.code === 200) {
          toast.success('更新成功')
          loadStorylines()
          setShowForm(false)
        } else {
          toast.error(response.msg || '更新失败')
        }
      } else {
        const response = await storylineApi.createStoryline({
          novelId,
          ...storylineForm,
          status: 'planning',
        })
        if (response.code === 200) {
          toast.success('创建成功')
          loadStorylines()
          setShowForm(false)
        } else {
          toast.error(response.msg || '创建失败')
        }
      }
    } catch (error: any) {
      toast.error(error.msg || '操作失败')
    }
  }

  const handleDeleteStoryline = async (id: number) => {
    if (!confirm('确定要删除这条故事线吗？')) return
    try {
      const response = await storylineApi.deleteStoryline(id)
      if (response.code === 200) {
        toast.success('删除成功')
        if (selectedStoryline === id) {
          setSelectedStoryline(null)
        }
        loadStorylines()
      } else {
        toast.error(response.msg || '删除失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '删除失败')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {/* AI 生成进度展示 */}
      {generationProgress && (
        <div className="mb-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                {generationProgress.message}
              </span>
            </div>
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {generationProgress.progress}%
            </span>
          </div>
          
          {/* 进度条 */}
          <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500 ease-out"
              style={{ width: `${generationProgress.progress}%` }}
            >
              <div className="absolute inset-0 bg-white/30 animate-pulse" />
            </div>
          </div>
          
          {/* 阶段指示器 */}
          <div className="mt-4 flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span className={generationProgress.stage === 'preparing' ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''}>
              准备
            </span>
            <span className={generationProgress.stage === 'analyzing' ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''}>
              分析
            </span>
            <span className={generationProgress.stage === 'generating' ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''}>
              生成
            </span>
            <span className={generationProgress.stage === 'processing' ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''}>
              处理
            </span>
            <span className={generationProgress.stage === 'saving' ? 'text-purple-600 dark:text-purple-400 font-semibold' : ''}>
              保存
            </span>
            <span className={generationProgress.stage === 'complete' ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
              完成
            </span>
          </div>
        </div>
      )}

      {showForm ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingStoryline ? '编辑故事线' : '创建故事线'}
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              故事线标题 *
            </label>
            <Input
              value={storylineForm.title}
              onChange={(e) => setStorylineForm({ ...storylineForm, title: e.target.value })}
              placeholder="例如：主线剧情、感情线、成长线"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              故事线描述
            </label>
            <Textarea
              ref={(el) => setTextareaRef(el)}
              value={storylineForm.description}
              onChange={(e) => setStorylineForm({ ...storylineForm, description: e.target.value })}
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              placeholder="描述这条故事线的主要内容和发展方向"
              rows={15}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              可以包含故事线的总体描述和详细的节点信息。选中文本后可以使用局部扩写功能。
            </p>
            {selectedText && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  已选中 {selectedText.length} 个字符
                </p>
              </div>
            )}
          </div>

          {/* AI 辅助功能 */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-900 dark:text-white">AI 辅助</span>
            </div>
            
            {/* AI 完善填充 */}
            <div className="mb-3">
              <Button
                type="button"
                size="sm"
                onClick={handleAIEnhance}
                loading={aiEnhancing}
                disabled={!storylineForm.title.trim() || aiEnhancing || aiSuggesting || aiExpandingPart}
                variant="outline"
                className="border-purple-300 text-purple-600 hover:bg-purple-50 whitespace-nowrap w-full"
              >
                {aiEnhancing ? (
                  'AI 完善中...'
                ) : (
                  <span className="flex items-center justify-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 完善填充
                  </span>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                根据标题自动生成详细的故事线描述和节点
              </p>
            </div>

            {/* 局部扩写 */}
            <div className="mb-3 p-3 bg-white dark:bg-gray-800/50 rounded border border-purple-200 dark:border-purple-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                局部扩写
              </label>
              <p className="text-xs text-gray-500 mb-2">
                在描述框中选中要扩写的文本，然后点击扩写按钮
              </p>
              <Input
                value={expandHint}
                onChange={(e) => setExpandHint(e.target.value)}
                placeholder="扩写提示（可选）：例如增加更多细节、加入对话等"
                className="mb-2 text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleExpandPart}
                loading={aiExpandingPart}
                disabled={!selectedText.trim() || aiEnhancing || aiSuggesting || aiExpandingPart}
                variant="outline"
                className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 whitespace-nowrap w-full"
              >
                {aiExpandingPart ? (
                  'AI 扩写中...'
                ) : (
                  <span className="flex items-center justify-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    扩写选中部分
                  </span>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                对选中的内容进行详细扩写，保持上下文连贯
              </p>
            </div>

            {/* AI 修改建议 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                您的修改意见
              </label>
              <Textarea
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                placeholder="告诉 AI 你想如何修改，例如：&#10;- 增加更多冒险元素&#10;- 让节奏更紧凑&#10;- 加入感情线&#10;- 突出主角的成长"
                rows={3}
                className="mb-2"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAISuggest}
                loading={aiSuggesting}
                disabled={!storylineForm.title.trim() || !storylineForm.description.trim() || !userFeedback.trim() || aiEnhancing || aiSuggesting || aiExpandingPart}
                variant="outline"
                className="border-blue-300 text-blue-600 hover:bg-blue-50 whitespace-nowrap w-full"
              >
                {aiSuggesting ? (
                  'AI 修改中...'
                ) : (
                  <span className="flex items-center justify-center">
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 根据意见修改
                  </span>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                AI 会根据您的意见修改整个故事线内容
              </p>
            </div>
          </div>

          {/* AI 修改结果展示 */}
          {suggestions && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-900 dark:text-white">AI 已更新内容</span>
                </div>
                <button
                  onClick={() => setSuggestions('')}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  关闭提示
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                内容已根据您的意见更新，请查看上方的描述框
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSaveStoryline}>
              保存
            </Button>
            <Button variant="outline" onClick={() => {
              setShowForm(false)
              setSuggestions('')
              setUserFeedback('')
              setExpandHint('')
              setSelectedText('')
            }}>
              取消
            </Button>
          </div>
        </div>
      ) : (
        <div>
          {storylines.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                还没有故事线，让 AI 帮你生成吧
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={handleAIGenerate}
                  loading={aiGenerating}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 whitespace-nowrap"
                >
                  {aiGenerating ? (
                    'AI 生成中...'
                  ) : (
                    <span className="flex items-center">
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI 生成故事线
                    </span>
                  )}
                </Button>
                <Button variant="outline" onClick={handleCreateStoryline}>
                  <span className="flex items-center whitespace-nowrap">
                    <Plus className="w-4 h-4 mr-2" />
                    手动创建
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  故事线列表
                </h3>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleAIGenerate}
                    loading={aiGenerating}
                    variant="outline"
                    className="border-purple-300 text-purple-600 hover:bg-purple-50 whitespace-nowrap"
                  >
                    {aiGenerating ? (
                      'AI 生成中...'
                    ) : (
                      <span className="flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI 生成更多
                      </span>
                    )}
                  </Button>
                  <Button size="sm" onClick={handleCreateStoryline}>
                    <span className="flex items-center whitespace-nowrap">
                      <Plus className="w-4 h-4 mr-2" />
                      新建故事线
                    </span>
                  </Button>
                </div>
              </div>

              <div className="grid gap-4">
                {storylines.map((storyline) => (
                  <div
                    key={storyline.id}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedStoryline === storyline.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedStoryline(storyline.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {storyline.title}
                          </h4>
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {storyline.nodeCount || 0} 个节点
                          </span>
                        </div>
                        {storyline.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {storyline.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditStoryline(storyline)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteStoryline(storyline.id)
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 故事节点展示 */}
              {selectedStoryline && nodes.length > 0 && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                    故事节点
                  </h4>
                  <div className="space-y-3">
                    {nodes.map((node, index) => (
                      <div
                        key={node.id}
                        className="flex items-start space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-shrink-0 mt-1">
                          <Circle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              节点 {index + 1}
                            </span>
                            <h5 className="font-medium text-gray-900 dark:text-white">
                              {node.title}
                            </h5>
                          </div>
                          {node.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {node.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
