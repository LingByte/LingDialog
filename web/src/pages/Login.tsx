import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Card from '@/components/UI/Card'
import FadeIn from '@/components/Animations/FadeIn'
import toast from 'react-hot-toast'

interface LoginForm {
  email: string
  password: string
  remember: boolean
}

interface EmailCodeForm {
  email: string
  code: string
}

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, setLoading, isLoading } = useAuthStore()
  const [loginType, setLoginType] = useState<'password' | 'email'>('password')
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
    remember: false
  })
  const [emailCodeForm, setEmailCodeForm] = useState<EmailCodeForm>({
    email: '',
    code: ''
  })
  const [countdown, setCountdown] = useState(0)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      toast.error('请填写邮箱和密码')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.loginWithPassword({
        email: form.email,
        password: form.password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        remember: form.remember,
        authToken: true
      })

      if (response.code === 200) {
        const success = await login(response.data.token, response.data.user)
        if (success) {
          toast.success('登录成功')
          navigate('/')
        } else {
          toast.error('登录失败，请重试')
        }
      } else {
        toast.error(response.msg || '登录失败')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.msg || '登录失败，请检查网络连接')
    } finally {
      setLoading(false)
    }
  }

  const handleSendCode = async () => {
    if (!emailCodeForm.email) {
      toast.error('请输入邮箱地址')
      return
    }

    try {
      const response = await authApi.sendEmailCode({
        email: emailCodeForm.email,
        type: 'login'
      })

      if (response.code === 200) {
        toast.success('验证码已发送到您的邮箱')
        setCountdown(60)
        
        // 开始倒计时
        const timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        toast.error(response.msg || '发送验证码失败')
      }
    } catch (error: any) {
      console.error('Send code error:', error)
      toast.error(error.response?.data?.msg || '发送验证码失败')
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailCodeForm.email || !emailCodeForm.code) {
      toast.error('请填写邮箱和验证码')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.loginWithEmailCode({
        email: emailCodeForm.email,
        code: emailCodeForm.code,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        authToken: true
      })

      if (response.code === 200) {
        const success = await login(response.data.token, response.data.user)
        if (success) {
          toast.success('登录成功')
          navigate('/')
        } else {
          toast.error('登录失败，请重试')
        }
      } else {
        toast.error(response.msg || '登录失败')
      }
    } catch (error: any) {
      console.error('Email login error:', error)
      toast.error(error.response?.data?.msg || '登录失败，请检查验证码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <FadeIn>
        <div className="w-full max-w-lg">
          <Card className="p-10 shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            {/* 头部 */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h1>
              <p className="text-gray-600 text-sm">登录您的账户继续使用 LingDialog</p>
            </div>

            {/* 登录方式切换 */}
            <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
              <button
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginType === 'password'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setLoginType('password')}
              >
                密码登录
              </button>
              <button
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginType === 'email'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setLoginType('email')}
              >
                邮箱验证码
              </button>
            </div>

            {/* 登录表单 */}
            {loginType === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="请输入邮箱地址"
                    required
                    className="h-12 w-full"
                    inputClassName="text-base px-4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    密码
                  </label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="请输入密码"
                    required
                    className="h-12 w-full"
                    inputClassName="text-base px-4"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={form.remember}
                      onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="ml-2 text-sm text-gray-600">记住我</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    忘记密码？
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 mt-6"
                  loading={isLoading}
                >
                  登录
                </Button>
              </form>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </label>
                  <Input
                    type="email"
                    value={emailCodeForm.email}
                    onChange={(e) => setEmailCodeForm({ ...emailCodeForm, email: e.target.value })}
                    placeholder="请输入邮箱地址"
                    required
                    className="h-12 w-full"
                    inputClassName="text-base px-4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    验证码
                  </label>
                  <div className="flex space-x-3">
                    <Input
                      type="text"
                      value={emailCodeForm.code}
                      onChange={(e) => setEmailCodeForm({ ...emailCodeForm, code: e.target.value })}
                      placeholder="请输入验证码"
                      required
                      className="flex-1 h-12"
                      inputClassName="text-base px-4"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={countdown > 0}
                      className="whitespace-nowrap h-12 px-6 text-sm border-gray-300 hover:border-blue-500 hover:text-blue-600"
                    >
                      {countdown > 0 ? `${countdown}s` : '发送验证码'}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 mt-6"
                  loading={isLoading}
                >
                  登录
                </Button>
              </form>
            )}

            {/* 底部链接 */}
            <div className="mt-6 text-center">
              <span className="text-gray-600 text-sm">还没有账户？</span>
              <Link
                to="/register"
                className="ml-1 text-blue-600 hover:text-blue-500 font-medium text-sm transition-colors"
              >
                立即注册
              </Link>
            </div>

            {/* 测试账户提示 */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 text-center">
                测试账户：test@lingecho.com / test123
              </p>
            </div>
          </Card>
        </div>
      </FadeIn>
    </div>
  )
}

export default Login