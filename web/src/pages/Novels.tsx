import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Search, Edit, Trash2, Eye } from 'lucide-react'
import { novelsApi, type Novel } from '@/api/novels'
import Layout from '@/components/Layout/Layout'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Card from '@/components/UI/Card'
import toast from 'react-hot-toast'

export default function Novels() {
  const [novels, setNovels] = useState<Novel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadNovels()
  }, [])

  const loadNovels = async () => {
    try {
      setLoading(true)
      const response = await novelsApi.queryNovels({
        pos: 0,
        limit: 100,
        keyword: searchKeyword || undefined,
      })
      if (response.code === 200) {
        setNovels(response.data?.items || [])
      } else {
        toast.error(response.msg || '加载失败')
      }
    } catch (error: any) {
      toast.error(error.msg || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    loadNovels()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这本小说吗？')) return
    
    try {
      const response = await novelsApi.deleteNovel(id)
      if (response.code === 200) {
        toast.success('删除成功')
        loadNovels()
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              AI 写小说
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              使用 AI 创作你的小说作品
            </p>
          </div>
          <Button
            onClick={() => navigate('/novels/create')}
            leftIcon={<Plus className="w-5 h-5" />}
          >
            创建新小说
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6 flex gap-4">
          <Input
            placeholder="搜索小说..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} leftIcon={<Search className="w-5 h-5" />}>
            搜索
          </Button>
        </div>

        {/* Novels Grid */}
        {novels.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              还没有小说
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              开始创建你的第一本小说吧！
            </p>
            <Button onClick={() => navigate('/novels/create')} leftIcon={<Plus className="w-5 h-5" />}>
              创建新小说
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {novels.map((novel) => (
              <Card key={novel.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {novel.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className={`px-2 py-1 rounded ${
                        novel.status === 'published' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                      }`}>
                        {novel.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/novels/${novel.id}`)}
                    leftIcon={<Eye className="w-4 h-4" />}
                    className="flex-1"
                  >
                    查看
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/novels/${novel.id}/edit`)}
                    leftIcon={<Edit className="w-4 h-4" />}
                    className="flex-1"
                  >
                    编辑
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(novel.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
    </Layout>
  )
}

