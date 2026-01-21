import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Sparkles } from 'lucide-react'
import { novelsApi } from '@/api/novels'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Textarea from '@/components/UI/Textarea'
import Card from '@/components/UI/Card'
import toast from 'react-hot-toast'

export default function EditNovel() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [analyzingStyle, setAnalyzingStyle] = useState(false)
  const [referenceText, setReferenceText] = useState('')
  const [showReferenceInput, setShowReferenceInput] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    status: 'draft',
    genre: '',
    description: '',
    worldSetting: '',
    tags: '',
    styleGuide: '',
    referenceNovel: '',
  })

  useEffect(() => {
    if (id) {
      loadNovel()
    }
  }, [id])

  const loadNovel = async () => {
    if (!id) return
    try {
      setLoadingData(true)
      const response = await novelsApi.getNovel(Number(id))
      if (response.code === 200) {
        const novel = response.data
        setFormData({
          title: novel.title || '',
          status: novel.status || 'draft',
          genre: novel.genre || '',
          description: novel.description || '',
          worldSetting: novel.worldSetting || '',
          tags: novel.tags || '',
          styleGuide: (novel as any).styleGuide || '',
          referenceNovel: (novel as any).referenceNovel || '',
        })
      } else {
        toast.error(response.msg || '加载失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '加载失败')
    } finally {
      setLoadingData(false)
    }
  }

  const handleAnalyzeStyle = async () => {
    if (!referenceText.trim()) {
      toast.error('请先粘贴参考小说内容')
      return
    }

    if (!formData.title.trim()) {
      toast.error('请先输入小说标题')
      return
    }

    try {
      setAnalyzingStyle(true)
      toast.loading('正在分析风格，请稍候...', { id: 'analyzing' })
      
      const response = await novelsApi.analyzeStyle({
        novelTitle: formData.title,
        novelGenre: formData.genre,
        referenceText: referenceText,
      })
      
      if (response.code === 200) {
        toast.success('风格分析完成', { id: 'analyzing' })
        setFormData({
          ...formData,
          styleGuide: response.data.styleGuide,
          referenceNovel: referenceText,
        })
        setShowReferenceInput(false)
        setReferenceText('')
      } else {
        toast.error(response.msg || '分析失败', { id: 'analyzing' })
      }
    } catch (error: any) {
      toast.error(error.msg || '分析失败', { id: 'analyzing' })
    } finally {
      setAnalyzingStyle(false)
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
      
      // 构建更新数据，过滤掉空字符串
      const updateData: any = {
        title: formData.title,
        status: formData.status,
      }
      
      if (formData.genre) updateData.genre = formData.genre
      if (formData.description) updateData.description = formData.description
      if (formData.worldSetting) updateData.worldSetting = formData.worldSetting
      if (formData.tags) updateData.tags = formData.tags
      if (formData.styleGuide) updateData.styleGuide = formData.styleGuide
      if (formData.referenceNovel) updateData.referenceNovel = formData.referenceNovel
      
      const response = await novelsApi.updateNovel(Number(id), updateData)
      
      if (response.code === 200) {
        toast.success('更新成功')
        navigate(`/novels/${id}`)
      } else {
        toast.error(response.msg || '更新失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '更新失败')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/novels/${id}`)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-6"
        >
          返回详情
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            编辑小说
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                小说标题 *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="请输入小说标题"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                小说类型
              </label>
              <select
                value={formData.genre}
                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                小说简介
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入小说简介"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                世界观设定
              </label>
              <Textarea
                value={formData.worldSetting}
                onChange={(e) => setFormData({ ...formData, worldSetting: e.target.value })}
                placeholder="描述小说的世界观、背景设定、力量体系等"
                rows={6}
              />
              <p className="text-xs text-gray-500 mt-1">
                详细的世界观设定有助于 AI 生成更符合小说背景的角色
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                标签
              </label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="多个标签用逗号分隔，如：热血,冒险,成长"
              />
            </div>

            {/* 参考小说和风格学习 */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    风格学习
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    上传参考小说，AI 将学习其写作风格用于章节生成
                  </p>
                </div>
                {!showReferenceInput && !formData.styleGuide && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReferenceInput(true)}
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    添加参考小说
                  </Button>
                )}
              </div>

              {showReferenceInput && (
                <div className="space-y-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      粘贴参考小说内容
                    </label>
                    <Textarea
                      value={referenceText}
                      onChange={(e) => setReferenceText(e.target.value)}
                      placeholder="粘贴参考小说的内容（支持几十万字，AI 会智能采样分析）"
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      提示：可以粘贴完整小说，系统会自动从开头、中间、结尾提取代表性片段进行分析
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={handleAnalyzeStyle}
                      loading={analyzingStyle}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                    >
                      分析风格
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowReferenceInput(false)
                        setReferenceText('')
                      }}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}

              {formData.styleGuide && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                          风格指南已生成
                        </h4>
                        <div className="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap">
                          {formData.styleGuide}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReferenceInput(true)}
                      leftIcon={<Upload className="w-4 h-4" />}
                    >
                      重新分析
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, styleGuide: '', referenceNovel: '' })}
                    >
                      清除风格指南
                    </Button>
                  </div>
                </div>
              )}
            </div>

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
                保存
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/novels/${id}`)}
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
