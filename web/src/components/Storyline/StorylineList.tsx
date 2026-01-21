import { useState } from 'react'
import { Eye, EyeOff, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { type StorylineWithStats } from '@/api/novels'
import Button from '@/components/UI/Button'

interface StorylineListProps {
  storylines: StorylineWithStats[]
  selectedId: number | null
  visibleIds: Set<number>
  onSelect: (id: number) => void
  onToggleVisibility: (id: number) => void
  onUpdate: (id: number, data: Partial<StorylineWithStats>) => void
  onDelete: (id: number) => void
}

export default function StorylineList({
  storylines,
  selectedId,
  visibleIds,
  onSelect,
  onToggleVisibility,
  onUpdate,
  onDelete,
}: StorylineListProps) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    color: '',
  })

  const handleEdit = (storyline: StorylineWithStats) => {
    setEditingId(storyline.id)
    setEditForm({
      title: storyline.title,
      description: storyline.description || '',
      color: storyline.color,
    })
  }

  const handleSaveEdit = () => {
    if (editingId) {
      onUpdate(editingId, editForm)
      setEditingId(null)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: '', description: '', color: '' })
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      main: '主线',
      character: '角色线',
      plot: '情节线',
      theme: '主题线',
    }
    return labels[type as keyof typeof labels] || type
  }

  const getTypeColor = (type: string) => {
    const colors = {
      main: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      character: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      plot: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      theme: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  return (
    <div className="p-4 space-y-3">
      {storylines.map((storyline) => (
        <div
          key={storyline.id}
          className={`
            p-3 rounded-lg border cursor-pointer transition-all
            ${selectedId === storyline.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }
          `}
          onClick={() => onSelect(storyline.id)}
        >
          {editingId === storyline.id ? (
            // 编辑模式
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="故事线标题"
              />
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                rows={2}
                placeholder="故事线描述"
              />
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                />
                <div className="flex gap-1 ml-auto">
                  <Button size="xs" onClick={handleSaveEdit}>
                    保存
                  </Button>
                  <Button size="xs" variant="outline" onClick={handleCancelEdit}>
                    取消
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // 显示模式
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: storyline.color }}
                    />
                    <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                      {storyline.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeColor(storyline.type)}`}>
                      {getTypeLabel(storyline.type)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      优先级 {storyline.priority}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleVisibility(storyline.id)
                    }}
                    className="p-1"
                  >
                    {visibleIds.has(storyline.id) ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </Button>
                  
                  <div className="relative group">
                    <Button
                      size="xs"
                      variant="ghost"
                      className="p-1"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </Button>
                    
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(storyline)
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                      >
                        <Edit2 className="w-3 h-3" />
                        编辑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(storyline.id)
                        }}
                        className="flex items-center gap-2 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {storyline.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                  {storyline.description}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{storyline.nodeCount} 个节点</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${storyline.progress}%` }}
                    />
                  </div>
                  <span>{storyline.progress}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      {storylines.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">暂无故事线</p>
          <p className="text-xs mt-1">点击"AI 生成"或"添加"创建第一条故事线</p>
        </div>
      )}
    </div>
  )
}