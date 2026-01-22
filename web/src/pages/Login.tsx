import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import Button from '@/components/UI/Button'
import FadeIn from '@/components/Animations/FadeIn'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, Sparkles, BookOpen, Zap } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState<LoginForm>({
    email: 'test@lingecho.com',
    password: 'test123',
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
    <div className="min-h-screen relative overflow-hidden">
      {/* 动态背景 */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-blue-50 to-purple-100">
        {/* 动态粒子效果 */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-300/40 rounded-full"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              }}
              animate={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              }}
              transition={{
                duration: Math.random() * 10 + 20,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          ))}
        </div>
        
        {/* 渐变光晕 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* 左侧品牌展示区 */}
        <div className="hidden lg:flex lg:w-2/5 flex-col justify-center items-center p-12">
          <FadeIn delay={0.2}>
            <div className="max-w-md text-center">
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                LingDialog
              </h1>
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                AI 驱动的智能小说创作平台
              </p>
              
              {/* 特性展示 */}
              <div className="space-y-6">
                <motion.div 
                  className="flex items-center space-x-4 text-gray-700"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-lg">AI 辅助创作，激发无限灵感</span>
                </motion.div>
                <motion.div 
                  className="flex items-center space-x-4 text-gray-700"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-lg">智能情节生成，构建精彩故事</span>
                </motion.div>
                <motion.div 
                  className="flex items-center space-x-4 text-gray-700"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-lg">专业编辑工具，提升创作效率</span>
                </motion.div>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 右侧登录表单区 */}
        <div className="w-full lg:w-3/5 flex items-center justify-center p-8">
          <FadeIn delay={0.3}>
            <motion.div 
              className="w-full max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {/* 登录卡片 */}
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-gray-200/50">
                {/* 登录方式切换 */}
                <div className="flex mb-5 bg-gray-100 rounded-2xl p-1">
                  <motion.button
                    className={`flex-1 py-4 px-6 rounded-xl text-base font-medium transition-all duration-300 ${
                      loginType === 'password'
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setLoginType('password')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    密码登录
                  </motion.button>
                  <motion.button
                    className={`flex-1 py-4 px-6 rounded-xl text-base font-medium transition-all duration-300 ${
                      loginType === 'email'
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    onClick={() => setLoginType('email')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    邮箱验证码
                  </motion.button>
                </div>

                {/* 登录表单 */}
                {loginType === 'password' ? (
                  <form onSubmit={handlePasswordLogin} className="space-y-8">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="请输入邮箱地址"
                          required
                          className="w-full h-12 pl-14 pr-5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-2">
                        密码
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="请输入密码"
                          required
                          className="w-full h-12 pl-14 pr-14 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-base"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.remember}
                          onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 bg-white text-purple-600 focus:ring-purple-500 focus:ring-offset-0"
                        />
                        <span className="ml-3 text-base text-gray-700">记住我</span>
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-base text-purple-600 hover:text-purple-500 transition-colors"
                      >
                        忘记密码？
                      </Link>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-white"
                        loading={isLoading}
                      >
                        {isLoading ? '登录中...' : '登录'}
                      </Button>
                    </motion.div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailLogin} className="space-y-8">
                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-3">
                        邮箱地址
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={emailCodeForm.email}
                          onChange={(e) => setEmailCodeForm({ ...emailCodeForm, email: e.target.value })}
                          placeholder="请输入邮箱地址"
                          required
                          className="w-full h-12 pl-14 pr-5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-base"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-medium text-gray-700 mb-3">
                        验证码
                      </label>
                      <div className="flex space-x-4">
                        <input
                          type="text"
                          value={emailCodeForm.code}
                          onChange={(e) => setEmailCodeForm({ ...emailCodeForm, code: e.target.value })}
                          placeholder="请输入验证码"
                          required
                          className="flex-1 h-12 px-5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-base"
                        />
                        <motion.button
                          type="button"
                          onClick={handleSendCode}
                          disabled={countdown > 0}
                          className="px-8 h-12 bg-gray-100 border border-gray-200 rounded-2xl text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap text-base font-medium"
                          whileHover={{ scale: countdown > 0 ? 1 : 1.02 }}
                          whileTap={{ scale: countdown > 0 ? 1 : 0.98 }}
                        >
                          {countdown > 0 ? `${countdown}s` : '发送验证码'}
                        </motion.button>
                      </div>
                    </div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        type="submit"
                        className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-white"
                        loading={isLoading}
                      >
                        {isLoading ? '登录中...' : '登录'}
                      </Button>
                    </motion.div>
                  </form>
                )}

                {/* 底部链接 */}
                <div className="mt-5 text-center">
                  <span className="text-gray-600 text-base">还没有账户？</span>
                  <Link
                    to="/register"
                    className="ml-2 text-purple-600 hover:text-purple-500 font-medium text-base transition-colors"
                  >
                    立即注册
                  </Link>
                </div>
              </div>
            </motion.div>
          </FadeIn>
        </div>
      </div>
    </div>
  )
}

export default Login