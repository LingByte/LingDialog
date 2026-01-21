import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { type Novel } from '@/api/novels'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Textarea from '@/components/UI/Textarea'

interface AIGenerateDialogProps {
  novel: Novel | null
  onGenerate: (data: any) => void
  onClose: () => void
}

export default function AIGenerateDialog({
  novel,
  onGenerate,
  onClose,
}: AIGenerateDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    characters: '',
    mainConflict: '',
    storylineCount: 3,
    nodesPerLine: 6,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setLoading(true)
    try {
      const characters = formData.characters
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
      
      await onGenerate({
        characters,
        mainConflict: formData.mainConflict,
        storylineCount: formData.storylineCount,
        nodesPerLine: formData.nodesPerLine,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                AI 生成故事线
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 小说信息展示 */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                小说信息
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">标题：</span>
                  <span className="text-gray-900 dark:text-white">{novel?.title}</span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">类型：</span>
                  <span className="text-gray-900 dark:text-white">{novel?.genre || '未设置'}</span>
                </div>
              </div>
              {novel?.worldSetting && (
                <div className="mt-2">
                  <span className="text-gray-500 dark:text-gray-400 text-sm">世界观：</span>
                  <p className="text-gray-900 dark:text-white text-sm mt-1 line-clamp-3">
                    {novel.worldSetting}
                  </p>
                </div>
              )}
            </div>

            {/* 主要角色 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                主要角色描述
              </label>
              <Textarea
                value={formData.characters}
                onChange={(e) => setFormData({ ...formData, characters: e.target.value })}
                placeholder="每行一个角色，格式如：&#10;主角张三：修仙天才，性格坚毅&#10;女主李四：医师，温柔善良&#10;反派王五：邪恶宗主，实力强大"
                rows={6}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                每行描述一个角色，包括姓名、身份、性格等关键信息
              </p>
            </div>

            {/* 核心冲突 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                核心冲突
              </label>
              <Textarea
                value={formData.mainConflict}
                onChange={(e) => setFormData({ ...formData, mainConflict: e.target.value })}
                placeholder="描述小说的主要冲突，如：主角与邪恶势力的对抗、寻找失踪的师父、拯救即将毁灭的世界等"
                rows={3}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                描述推动整个故事发展的核心矛盾和冲突
              </p>
            </div>

            {/* 生成参数 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  故事线数量
                </label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.storylineCount}
                  onChange={(e) => setFormData({ ...formData, storylineCount: parseInt(e.target.value) || 3 })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  建议 2-5 条，包含主线和支线
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  每线节点数
                </label>
                <Input
                  type="number"
                  min={3}
                  max={15}
                  value={formData.nodesPerLine}
                  onChange={(e) => setFormData({ ...formData, nodesPerLine: parseInt(e.target.value) || 6 })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  每条故事线的关键节点数量
                </p>
              </div>
            </div>

            {/* 生成说明 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                AI 将为您生成：
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• 主故事线：核心情节发展脉络</li>
                <li>• 角色故事线：主要角色的成长弧</li>
                <li>• 情节故事线：重要的子情节发展</li>
                <li>• 节点连接：合理的因果关系和时间顺序</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                loading={loading}
                disabled={!formData.characters.trim() || !formData.mainConflict.trim()}
                className="flex-1"
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                {loading ? '生成中...' : '开始生成'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}