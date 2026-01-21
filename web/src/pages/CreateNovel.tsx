import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Sparkles, Lock, Unlock, RefreshCw, Loader2 } from 'lucide-react'
import { novelsApi } from '@/api/novels'
import { aiNovelApi } from '@/api/aiNovel'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Textarea from '@/components/UI/Textarea'
import Card from '@/components/UI/Card'
import toast from 'react-hot-toast'

interface GenerationProgress {
  stage: string
  progress: number
  message: string
}

export default function CreateNovel() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    status: 'draft',
    genre: '',
    description: '',
    worldSetting: '',
    tags: '',
  })
  
  // 固定字段（不让 AI 修改）
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set())
  
  // 用户反馈
  const [feedback, setFeedback] = useState('')

  const toggleLock = (field: string) => {
    const newLocked = new Set(lockedFields)
    if (newLocked.has(field)) {
      newLocked.delete(field)
    } else {
      newLocked.add(field)
    }
    setLockedFields(newLocked)
  }

  const handleGenerate = async () => {
    if (!formData.genre) {
      toast.error('请先选择小说类型')
      return
    }

    try {
      setGenerating(true)
      setGenerationProgress({ stage: 'preparing', progress: 20, message: '准备生成参数...' })
      
      // 模拟进度更新
      setTimeout(() => {
        setGenerationProgress({ stage: 'analyzing', progress: 40, message: '分析小说类型特点...' })
      }, 500)
      
      setTimeout(() => {
        setGenerationProgress({ stage: 'generating', progress: 60, message: 'AI 正在创作内容...' })
      }, 1500)
      
      const response = await aiNovelApi.generateSetting({
        genre: formData.genre,
        fixedFields: Array.from(lockedFields),
        title: formData.title,
        description: formData.description,
        worldSetting: formData.worldSetting,
        tags: formData.tags,
        feedback: feedback,
      })

      setGenerationProgress({ stage: 'processing', progress: 90, message: '处理生成结果...' })

      if (response.code === 200) {
        setGenerationProgress({ stage: 'complete', progress: 100, message: '生成完成！' })
        
        // 只更新未锁定的字段
        setFormData(prev => ({
          ...prev,
          title: lockedFields.has('title') ? prev.title : response.data.title,
          description: lockedFields.has('description') ? prev.description : response.data.description,
          worldSetting: lockedFields.has('worldSetting') ? prev.worldSetting : response.data.worldSetting,
          tags: lockedFields.has('tags') ? prev.tags : response.data.tags,
        }))
        
        // 清空反馈
        setFeedback('')
        toast.success('生成成功')
        
        setTimeout(() => {
          setGenerationProgress(null)
        }, 1000)
      } else {
        toast.error(response.msg || '生成失败')
        setGenerationProgress(null)
      }
    } catch (error: any) {
      toast.error(error.msg || '生成失败')
      setGenerationProgress(null)
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('请输入小说标题')
      return
    }

    try {
      setLoading(true)
      const response = await novelsApi.createNovel({
        title: formData.title,
        status: formData.status,
        genre: formData.genre || undefined,
        description: formData.description || undefined,
        worldSetting: formData.worldSetting || undefined,
        tags: formData.tags || undefined,
      })
      
      if (response.code === 200) {
        toast.success('创建成功')
        navigate(`/novels/${response.data.id}`)
      } else {
        toast.error(response.msg || '创建失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/novels')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回列表
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            创建新小说
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* AI 生成进度展示 */}
            {generationProgress && (
              <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
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
                  <span className={generationProgress.stage === 'complete' ? 'text-green-600 dark:text-green-400 font-semibold' : ''}>
                    完成
                  </span>
                </div>
              </div>
            )}

            {/* AI 生成按钮 */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-gray-900 dark:text-white">AI 智能生成</span>
                </div>
                <Button
                  type="button"
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={!formData.genre || generating}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 whitespace-nowrap"
                >
                  {generating ? (
                    '生成中...'
                  ) : (
                    <span className="flex items-center">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      生成设定
                    </span>
                  )}
                </Button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                选择类型后，点击生成按钮让 AI 帮你创建小说设定。可以锁定满意的内容，只修改其他部分。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                小说类型 *
              </label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">请选择类型</option>
                <option value="玄幻">玄幻</option>
                <option value="武侠">武侠</option>
                <option value="仙侠">仙侠</option>
                <option value="都市">都市</option>
                <option value="科幻">科幻</option>
                <option value="历史">历史</option>
                <option value="军事">军事</option>
                <option value="游戏">游戏</option>
                <option value="悬疑">悬疑</option>
                <option value="奇幻">奇幻</option>
                <option value="言情">言情</option>
                <option value="其他">其他</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  小说标题 *
                </label>
                <button
                  type="button"
                  onClick={() => toggleLock('title')}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  {lockedFields.has('title') ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>已锁定</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>未锁定</span>
                    </>
                  )}
                </button>
              </div>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入小说标题"
                required
                className={lockedFields.has('title') ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' : ''}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  小说简介
                </label>
                <button
                  type="button"
                  onClick={() => toggleLock('description')}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  {lockedFields.has('description') ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>已锁定</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>未锁定</span>
                    </>
                  )}
                </button>
              </div>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入小说简介"
                rows={4}
                className={lockedFields.has('description') ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' : ''}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  世界观设定
                </label>
                <button
                  type="button"
                  onClick={() => toggleLock('worldSetting')}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  {lockedFields.has('worldSetting') ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>已锁定</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>未锁定</span>
                    </>
                  )}
                </button>
              </div>
              <Textarea
                value={formData.worldSetting}
                onChange={(e) => setFormData({ ...formData, worldSetting: e.target.value })}
                placeholder="描述小说的世界观、背景设定、力量体系等"
                rows={6}
                className={lockedFields.has('worldSetting') ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                详细的世界观设定有助于 AI 生成更符合小说背景的角色
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  标签
                </label>
                <button
                  type="button"
                  onClick={() => toggleLock('tags')}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                >
                  {lockedFields.has('tags') ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>已锁定</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>未锁定</span>
                    </>
                  )}
                </button>
              </div>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="多个标签用逗号分隔，如：热血,冒险,成长"
                className={lockedFields.has('tags') ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20' : ''}
              />
            </div>

            {/* AI 反馈框 */}
            {formData.genre && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💬 对生成内容的反馈
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="告诉 AI 你想要什么样的改进，例如：&#10;- 标题要更有气势一些&#10;- 简介要突出主角的特殊能力&#10;- 世界观要更详细地描述修炼体系&#10;- 增加一些悬疑元素"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-2">
                  提供反馈后点击"生成设定"，AI 会根据你的要求调整内容。锁定的字段不会被修改。
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </select>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                loading={loading}
                className="flex-1"
              >
                创建
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/novels')}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}

