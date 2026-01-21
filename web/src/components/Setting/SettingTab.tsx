import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Sparkles, Loader2, BookOpen, Zap, Cpu, Lightbulb, Shield, Users, Package } from 'lucide-react'
import { settingApi, type NovelSetting } from '@/api/novels'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Textarea from '@/components/UI/Textarea'
import toast from 'react-hot-toast'

interface SettingTabProps {
  novelId: number
  novelTitle?: string
  novelGenre?: string
}

const CATEGORIES = [
  { value: 'world', label: '世界观背景', icon: BookOpen, color: 'blue' },
  { value: 'power', label: '力量体系', icon: Zap, color: 'yellow' },
  { value: 'tech', label: '科技设定', icon: Cpu, color: 'purple' },
  { value: 'concept', label: '基础概念', icon: Lightbulb, color: 'green' },
  { value: 'rule', label: '规则设定', icon: Shield, color: 'red' },
  { value: 'org', label: '组织势力', icon: Users, color: 'indigo' },
  { value: 'item', label: '物品道具', icon: Package, color: 'pink' },
  { value: 'other', label: '其他', icon: BookOpen, color: 'gray' },
]

export default function SettingTab({ novelId, novelTitle, novelGenre }: SettingTabProps) {
  const [settings, setSettings] = useState<Record<string, NovelSetting[]>>({})
  const [selectedCategory, setSelectedCategory] = useState<string>('world')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSetting, setEditingSetting] = useState<NovelSetting | null>(null)
  const [settingForm, setSettingForm] = useState({
    title: '',
    content: '',
    tags: '',
    category: 'world',
    isImportant: false,
  })
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiEnhancing, setAiEnhancing] = useState(false)
  const [requirements, setRequirements] = useState('')
  const [enhanceHint, setEnhanceHint] = useState('')

  useEffect(() => {
    loadSettings()
  }, [novelId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await settingApi.getSettingsByCategory(novelId)
      if (response.code === 200) {
        setSettings(response.data || {})
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSetting = (category: string) => {
    setEditingSetting(null)
    setSettingForm({
      title: '',
      content: '',
      tags: '',
      category,
      isImportant: false,
    })
    setRequirements('')
    setEnhanceHint('')
    setShowForm(true)
  }

  const handleEditSetting = (setting: NovelSetting) => {
    setEditingSetting(setting)
    setSettingForm({
      title: setting.title,
      content: setting.content || '',
      tags: setting.tags || '',
      category: setting.category,
      isImportant: setting.isImportant,
    })
    setRequirements('')
    setEnhanceHint('')
    setShowForm(true)
  }

  const handleAIGenerate = async () => {
    setAiGenerating(true)
    try {
      const response = await settingApi.generateSetting({
        novelId,
        novelTitle,
        novelGenre,
        category: settingForm.category,
        title: settingForm.title.trim() || undefined,
        context: settingForm.content.trim() || undefined,
        requirements: requirements.trim() || undefined,
      })

      if (response.code === 200) {
        setSettingForm({
          ...settingForm,
          title: response.data.title || settingForm.title,
          content: response.data.content,
          tags: response.data.tags || settingForm.tags,
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
    if (!settingForm.title.trim() || !settingForm.content.trim()) {
      toast.error('请先输入标题和内容')
      return
    }

    setAiEnhancing(true)
    try {
      const response = await settingApi.enhanceSetting({
        title: settingForm.title,
        content: settingForm.content,
        enhanceHint: enhanceHint.trim() || undefined,
      })

      if (response.code === 200) {
        setSettingForm({
          ...settingForm,
          content: response.data.content,
        })
        setEnhanceHint('')
        toast.success('AI 完善成功！')
      } else {
        toast.error(response.msg || 'AI 完善失败')
      }
    } catch (error: any) {
      toast.error(error.msg || 'AI 完善失败')
    } finally {
      setAiEnhancing(false)
    }
  }

  const handleSaveSetting = async () => {
    if (!settingForm.title.trim()) {
      toast.error('请输入设定标题')
      return
    }

    try {
      if (editingSetting) {
        const response = await settingApi.updateSetting(editingSetting.id, {
          ...settingForm,
          novelId,
        })
        if (response.code === 200) {
          toast.success('更新成功')
          loadSettings()
          setShowForm(false)
        } else {
          toast.error(response.msg || '更新失败')
        }
      } else {
        const response = await settingApi.createSetting({
          ...settingForm,
          novelId,
        })
        if (response.code === 200) {
          toast.success('创建成功')
          loadSettings()
          setShowForm(false)
        } else {
          toast.error(response.msg || '创建失败')
        }
      }
    } catch (error: any) {
      toast.error(error.msg || '操作失败')
    }
  }

  const handleDeleteSetting = async (id: number) => {
    if (!confirm('确定要删除这个设定吗？')) return
    try {
      const response = await settingApi.deleteSetting(id)
      if (response.code === 200) {
        toast.success('删除成功')
        loadSettings()
      } else {
        toast.error(response.msg || '删除失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '删除失败')
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat ? cat.icon : BookOpen
  }

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat ? cat.color : 'gray'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (showForm) {
    const Icon = getCategoryIcon(settingForm.category)
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingSetting ? '编辑设定' : '创建设定'}
          </h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            设定分类 *
          </label>
          <select
            value={settingForm.category}
            onChange={(e) => setSettingForm({ ...settingForm, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            disabled={!!editingSetting}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            设定标题 *
          </label>
          <Input
            value={settingForm.title}
            onChange={(e) => setSettingForm({ ...settingForm, title: e.target.value })}
            placeholder="例如：修炼等级体系、虚拟世界规则"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            设定内容
          </label>
          <Textarea
            value={settingForm.content}
            onChange={(e) => setSettingForm({ ...settingForm, content: e.target.value })}
            placeholder="详细描述这个设定的内容"
            rows={15}
            className="font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            标签
          </label>
          <Input
            value={settingForm.tags}
            onChange={(e) => setSettingForm({ ...settingForm, tags: e.target.value })}
            placeholder="用逗号分隔，例如：修炼,等级,突破"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isImportant"
            checked={settingForm.isImportant}
            onChange={(e) => setSettingForm({ ...settingForm, isImportant: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isImportant" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            标记为重要设定
          </label>
        </div>

        {/* AI 辅助功能 */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="flex items-center space-x-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="font-medium text-gray-900 dark:text-white">AI 辅助</span>
          </div>
          
          {/* AI 生成 */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              生成要求（可选）
            </label>
            <Textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="告诉 AI 你想要什么样的设定，例如：&#10;- 包含10个等级&#10;- 每个等级有明确的能力描述&#10;- 突破条件要合理"
              rows={3}
              className="mb-2"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAIGenerate}
              loading={aiGenerating}
              disabled={aiGenerating || aiEnhancing}
              variant="outline"
              className="border-purple-300 text-purple-600 hover:bg-purple-50 whitespace-nowrap w-full"
            >
              {aiGenerating ? (
                'AI 生成中...'
              ) : (
                <span className="flex items-center justify-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 生成设定
                </span>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              根据分类和要求自动生成设定内容
            </p>
          </div>

          {/* AI 完善 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              完善提示（可选）
            </label>
            <Input
              value={enhanceHint}
              onChange={(e) => setEnhanceHint(e.target.value)}
              placeholder="例如：增加更多细节、补充例子"
              className="mb-2"
            />
            <Button
              type="button"
              size="sm"
              onClick={handleAIEnhance}
              loading={aiEnhancing}
              disabled={!settingForm.title.trim() || !settingForm.content.trim() || aiGenerating || aiEnhancing}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50 whitespace-nowrap w-full"
            >
              {aiEnhancing ? (
                'AI 完善中...'
              ) : (
                <span className="flex items-center justify-center">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 完善内容
                </span>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              对现有内容进行扩充和完善
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSaveSetting}>
            保存
          </Button>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            取消
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 分类标签 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const count = settings[cat.value]?.length || 0
          return (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all ${
                selectedCategory === cat.value
                  ? `border-${cat.color}-500 bg-${cat.color}-50 dark:bg-${cat.color}-900/20`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Icon className={`w-4 h-4 ${selectedCategory === cat.value ? `text-${cat.color}-600 dark:text-${cat.color}-400` : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${selectedCategory === cat.value ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                {cat.label}
              </span>
              {count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCategory === cat.value
                    ? `bg-${cat.color}-100 dark:bg-${cat.color}-800 text-${cat.color}-600 dark:text-${cat.color}-300`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* 设定列表 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {CATEGORIES.find(c => c.value === selectedCategory)?.label}
          </h3>
          <Button size="sm" onClick={() => handleCreateSetting(selectedCategory)}>
            <span className="flex items-center whitespace-nowrap">
              <Plus className="w-4 h-4 mr-2" />
              新建设定
            </span>
          </Button>
        </div>

        {(!settings[selectedCategory] || settings[selectedCategory].length === 0) ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              还没有{CATEGORIES.find(c => c.value === selectedCategory)?.label}设定
            </p>
            <Button variant="outline" onClick={() => handleCreateSetting(selectedCategory)}>
              <span className="flex items-center whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                创建第一个设定
              </span>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {settings[selectedCategory].map((setting) => {
              const Icon = getCategoryIcon(setting.category)
              return (
                <div
                  key={setting.id}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {setting.title}
                        </h4>
                        {setting.isImportant && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                            重要
                          </span>
                        )}
                      </div>
                      {setting.content && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-2">
                          {setting.content}
                        </p>
                      )}
                      {setting.tags && (
                        <div className="flex flex-wrap gap-1">
                          {setting.tags.split(',').map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditSetting(setting)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSetting(setting.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
