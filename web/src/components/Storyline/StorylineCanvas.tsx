import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Sparkles } from 'lucide-react'
import { storylineApi, type StorylineWithStats, type StoryNode, type NodeConnection } from '@/api/novels'
import Button from '@/components/UI/Button'
import Card from '@/components/UI/Card'
import toast from 'react-hot-toast'

interface StorylineCanvasProps {
  storylines: StorylineWithStats[]
  selectedStorylineId: number | null
  onStorylineSelect: (id: number) => void
  onNodesUpdate: () => void
}

export default function StorylineCanvas({
  storylines,
  selectedStorylineId,
  onStorylineSelect,
  onNodesUpdate,
}: StorylineCanvasProps) {
  const [nodes, setNodes] = useState<StoryNode[]>([])
  const [connections, setConnections] = useState<NodeConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [showNodeEditor, setShowNodeEditor] = useState(false)
  const [nodeForm, setNodeForm] = useState({
    title: '',
    description: '',
    nodeType: 'event' as const,
    chapterRange: '',
    status: 'planned' as const,
  })

  const selectedStoryline = storylines.find(s => s.id === selectedStorylineId)

  useEffect(() => {
    if (selectedStorylineId) {
      loadNodes()
      loadConnections()
    } else {
      setNodes([])
      setConnections([])
    }
  }, [selectedStorylineId])

  const loadNodes = async () => {
    if (!selectedStorylineId) return
    
    try {
      setLoading(true)
      const response = await storylineApi.getStoryNodes(selectedStorylineId)
      if (response.code === 200) {
        setNodes(response.data)
      }
    } catch (error: any) {
      toast.error(error.msg || '加载节点失败')
    } finally {
      setLoading(false)
    }
  }

  const loadConnections = async () => {
    if (!selectedStorylineId) return
    
    try {
      const response = await storylineApi.getNodeConnections(selectedStorylineId)
      if (response.code === 200) {
        setConnections(response.data)
      }
    } catch (error: any) {
      console.error('Failed to load connections:', error)
    }
  }

  const handleCreateNode = async () => {
    if (!selectedStorylineId) return
    
    try {
      const response = await storylineApi.createStoryNode({
        storylineId: selectedStorylineId,
        title: nodeForm.title || '新节点',
        description: nodeForm.description,
        nodeType: nodeForm.nodeType,
        chapterRange: nodeForm.chapterRange,
        status: nodeForm.status,
        position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
        characters: [],
        plotPoints: [],
        orderIndex: nodes.length,
      })
      
      if (response.code === 200) {
        toast.success('节点创建成功')
        loadNodes()
        onNodesUpdate()
        setShowNodeEditor(false)
        resetNodeForm()
      } else {
        toast.error(response.msg || '创建失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '创建失败')
    }
  }

  const handleUpdateNode = async (nodeId: number, updates: Partial<StoryNode>) => {
    try {
      const response = await storylineApi.updateStoryNode(nodeId, updates)
      if (response.code === 200) {
        toast.success('节点更新成功')
        loadNodes()
        onNodesUpdate()
      } else {
        toast.error(response.msg || '更新失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '更新失败')
    }
  }

  const handleDeleteNode = async (nodeId: number) => {
    if (!confirm('确定要删除这个节点吗？')) return
    
    try {
      const response = await storylineApi.deleteStoryNode(nodeId)
      if (response.code === 200) {
        toast.success('节点删除成功')
        loadNodes()
        onNodesUpdate()
        if (selectedNodeId === nodeId) {
          setSelectedNodeId(null)
        }
      } else {
        toast.error(response.msg || '删除失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '删除失败')
    }
  }

  const resetNodeForm = () => {
    setNodeForm({
      title: '',
      description: '',
      nodeType: 'event',
      chapterRange: '',
      status: 'planned',
    })
  }

  const getNodeTypeLabel = (type: string) => {
    const labels = {
      start: '开始',
      event: '事件',
      turning: '转折',
      merge: '汇合',
      end: '结束',
    }
    return labels[type as keyof typeof labels] || type
  }

  const getNodeTypeColor = (type: string) => {
    const colors = {
      start: 'bg-green-500',
      event: 'bg-blue-500',
      turning: 'bg-yellow-500',
      merge: 'bg-purple-500',
      end: 'bg-red-500',
    }
    return colors[type as keyof typeof colors] || 'bg-gray-500'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planned: 'border-gray-300 bg-white',
      writing: 'border-yellow-400 bg-yellow-50',
      completed: 'border-green-400 bg-green-50',
    }
    return colors[status as keyof typeof colors] || 'border-gray-300 bg-white'
  }

  if (!selectedStoryline) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p className="text-lg mb-2">选择一个故事线开始编辑</p>
          <p className="text-sm">在左侧选择或创建一个故事线来查看和编辑节点</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {selectedStoryline.title}
            </h3>
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: selectedStoryline.color }}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowNodeEditor(true)}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              添加节点
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              AI 优化
            </Button>
          </div>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">暂无节点</p>
              <p className="text-sm mb-4">点击"添加节点"创建第一个故事节点</p>
              <Button
                onClick={() => setShowNodeEditor(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                添加节点
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative min-h-full">
            {/* 简单的网格布局显示节点 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {nodes.map((node, index) => (
                <Card
                  key={node.id}
                  className={`
                    p-4 cursor-pointer transition-all hover:shadow-md
                    ${selectedNodeId === node.id ? 'ring-2 ring-blue-500' : ''}
                    ${getStatusColor(node.status)}
                  `}
                  onClick={() => setSelectedNodeId(node.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getNodeTypeColor(node.nodeType)}`} />
                      <span className="text-xs text-gray-500">
                        {getNodeTypeLabel(node.nodeType)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: 打开编辑对话框
                        }}
                        className="p-1"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNode(node.id)
                        }}
                        className="p-1 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                    {node.title}
                  </h4>
                  
                  {node.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-3">
                      {node.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {node.chapterRange && (
                      <span>章节 {node.chapterRange}</span>
                    )}
                    <span className="ml-auto">#{index + 1}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 节点编辑对话框 */}
      {showNodeEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              添加节点
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  节点标题 *
                </label>
                <input
                  type="text"
                  value={nodeForm.title}
                  onChange={(e) => setNodeForm({ ...nodeForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="请输入节点标题"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  节点类型
                </label>
                <select
                  value={nodeForm.nodeType}
                  onChange={(e) => setNodeForm({ ...nodeForm, nodeType: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="start">开始节点</option>
                  <option value="event">事件节点</option>
                  <option value="turning">转折节点</option>
                  <option value="merge">汇合节点</option>
                  <option value="end">结束节点</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  节点描述
                </label>
                <textarea
                  value={nodeForm.description}
                  onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                  rows={3}
                  placeholder="描述这个节点的具体内容"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  涉及章节
                </label>
                <input
                  type="text"
                  value={nodeForm.chapterRange}
                  onChange={(e) => setNodeForm({ ...nodeForm, chapterRange: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="如：1-3 或 5"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleCreateNode}
                disabled={!nodeForm.title.trim()}
                className="flex-1"
              >
                创建节点
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowNodeEditor(false)
                  resetNodeForm()
                }}
                className="flex-1"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}