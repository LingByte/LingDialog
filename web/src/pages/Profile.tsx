import React, { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Card from '@/components/UI/Card'
import Avatar from '@/components/UI/Avatar'
import FadeIn from '@/components/Animations/FadeIn'
import { 
  User, 
  Phone, 
  MapPin, 
  Settings,
  Mail,
  Globe,
  Clock,
  Languages
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileForm {
  displayName: string
  firstName: string
  lastName: string
  phone: string
  avatar: string
  gender: string
  city: string
  region: string
  country: string
  timezone: string
  locale: string
}

const Profile: React.FC = () => {
  const { user, updateProfile, refreshUserInfo } = useAuthStore()
  const [form, setForm] = useState<ProfileForm>({
    displayName: '',
    firstName: '',
    lastName: '',
    phone: '',
    avatar: '',
    gender: '',
    city: '',
    region: '',
    country: '',
    timezone: '',
    locale: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'location' | 'preferences'>('basic')

  useEffect(() => {
    if (user) {
      setForm({
        displayName: user.displayName || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        gender: user.gender || '',
        city: user.city || '',
        region: user.region || '',
        country: user.country || '',
        timezone: user.timezone || '',
        locale: user.locale || ''
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsLoading(true)
    try {
      const response = await authApi.updateProfile(form)
      
      if (response.code === 200) {
        updateProfile(response.data.user)
        toast.success('资料更新成功')
        await refreshUserInfo()
      } else {
        toast.error(response.msg || '更新失败')
      }
    } catch (error: any) {
      console.error('Update profile error:', error)
      toast.error(error.response?.data?.msg || '更新失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const getProfileCompleteness = () => {
    if (!user) return 0
    return user.profileComplete || 0
  }

  const tabs = [
    { key: 'basic', label: '基本信息', icon: <User className="w-4 h-4" /> },
    { key: 'contact', label: '联系方式', icon: <Phone className="w-4 h-4" /> },
    { key: 'location', label: '地址信息', icon: <MapPin className="w-4 h-4" /> },
    { key: 'preferences', label: '偏好设置', icon: <Settings className="w-4 h-4" /> }
  ]

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">请先登录</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <FadeIn>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">个人资料</h1>
            <p className="text-gray-600">管理您的个人信息和偏好设置</p>
          </div>

          {/* 资料完整度 */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">资料完整度</h2>
              <span className="text-2xl font-bold text-blue-600">{getProfileCompleteness()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${getProfileCompleteness()}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              完善您的资料可以获得更好的使用体验
            </p>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 侧边栏 */}
            <div className="lg:col-span-1">
              <Card className="p-4">
                {/* 用户头像和基本信息 */}
                <div className="text-center mb-6">
                  <Avatar
                    src={user.avatar}
                    alt={user.displayName || user.email}
                    size="lg"
                    className="mx-auto mb-4"
                  />
                  <h3 className="font-semibold text-gray-900">
                    {user.displayName || `${user.firstName} ${user.lastName}`.trim() || '未设置'}
                  </h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {user.role === 'admin' ? '管理员' : '用户'}
                  </p>
                </div>

                {/* 导航标签 */}
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        activeTab === tab.key
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-3">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </Card>
            </div>

            {/* 主内容区 */}
            <div className="lg:col-span-3">
              <Card className="p-6">
                <form onSubmit={handleSubmit}>
                  {activeTab === 'basic' && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">基本信息</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          头像URL
                        </label>
                        <Input
                          type="url"
                          value={form.avatar}
                          onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                          placeholder="请输入头像图片URL"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          显示名称
                        </label>
                        <Input
                          type="text"
                          value={form.displayName}
                          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                          placeholder="请输入显示名称"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            姓
                          </label>
                          <Input
                            type="text"
                            value={form.lastName}
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                            placeholder="姓"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            名
                          </label>
                          <Input
                            type="text"
                            value={form.firstName}
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                            placeholder="名"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          性别
                        </label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择</option>
                          <option value="male">男</option>
                          <option value="female">女</option>
                          <option value="other">其他</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 'contact' && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">联系方式</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          邮箱地址
                        </label>
                        <Input
                          type="email"
                          value={user.email}
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">邮箱地址不可修改</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          手机号码
                        </label>
                        <Input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="请输入手机号码"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'location' && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">地址信息</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          国家
                        </label>
                        <Input
                          type="text"
                          value={form.country}
                          onChange={(e) => setForm({ ...form, country: e.target.value })}
                          placeholder="请输入国家"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          省份/地区
                        </label>
                        <Input
                          type="text"
                          value={form.region}
                          onChange={(e) => setForm({ ...form, region: e.target.value })}
                          placeholder="请输入省份或地区"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          城市
                        </label>
                        <Input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="请输入城市"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'preferences' && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">偏好设置</h2>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          时区
                        </label>
                        <select
                          value={form.timezone}
                          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择时区</option>
                          <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
                          <option value="America/New_York">美国东部时间 (UTC-5)</option>
                          <option value="America/Los_Angeles">美国西部时间 (UTC-8)</option>
                          <option value="Europe/London">英国时间 (UTC+0)</option>
                          <option value="Asia/Tokyo">日本时间 (UTC+9)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          语言
                        </label>
                        <select
                          value={form.locale}
                          onChange={(e) => setForm({ ...form, locale: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">请选择语言</option>
                          <option value="zh-CN">简体中文</option>
                          <option value="zh-TW">繁体中文</option>
                          <option value="en-US">English (US)</option>
                          <option value="ja-JP">日本語</option>
                          <option value="ko-KR">한국어</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 flex justify-end">
                    <Button
                      type="submit"
                      loading={isLoading}
                      className="px-8"
                    >
                      保存更改
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        </FadeIn>
      </div>
    </div>
  )
}

export default Profile