import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authApi } from '@/api/auth'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Card from '@/components/UI/Card'
import FadeIn from '@/components/Animations/FadeIn'
import toast from 'react-hot-toast'

interface RegisterForm {
  email: string
  password: string
  confirmPassword: string
  displayName: string
  firstName: string
  lastName: string
  code: string
  agreeTerms: boolean
}

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { login, setLoading, isLoading } = useAuthStore()
  const [form, setForm] = useState<RegisterForm>({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    firstName: '',
    lastName: '',
    code: '',
    agreeTerms: false
  })
  const [countdown, setCountdown] = useState(0)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const checkPasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 6) strength += 1
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[a-z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1
    return Math.min(strength, 4)
  }

  const handlePasswordChange = (password: string) => {
    setForm({ ...form, password })
    setPasswordStrength(checkPasswordStrength(password))
  }

  const handleSendCode = async () => {
    if (!form.email) {
      toast.error('请输入邮箱地址')
      return
    }

    try {
      const response = await authApi.sendEmailCode({
        email: form.email,
        type: 'register'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 表单验证
    if (!form.email || !form.password || !form.confirmPassword) {
      toast.error('请填写所有必填字段')
      return
    }

    if (form.password !== form.confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (form.password.length < 6) {
      toast.error('密码长度至少6位')
      return
    }

    if (!form.agreeTerms) {
      toast.error('请同意用户协议和隐私政策')
      return
    }

    setLoading(true)
    try {
      const response = await authApi.registerUserByEmail({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        code: form.code
      })

      if (response.code === 200) {
        const success = await login(response.data.token, response.data.user)
        if (success) {
          toast.success('注册成功，欢迎加入！')
          navigate('/')
        } else {
          toast.error('注册成功，但登录失败，请手动登录')
          navigate('/login')
        }
      } else {
        toast.error(response.msg || '注册失败')
      }
    } catch (error: any) {
      console.error('Register error:', error)
      toast.error(error.response?.data?.msg || '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return 'bg-red-500'
      case 2:
        return 'bg-yellow-500'
      case 3:
        return 'bg-blue-500'
      case 4:
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getPasswordStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return '弱'
      case 2:
        return '中等'
      case 3:
        return '强'
      case 4:
        return '很强'
      default:
        return ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
      <FadeIn>
        <Card className="w-full max-w-lg p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">创建账户</h1>
            <p className="text-gray-600">加入我们，开始您的创作之旅</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱地址 *
              </label>
              <div className="flex space-x-2">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="请输入邮箱地址"
                  required
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || !form.email}
                  className="whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : '发送验证码'}
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱验证码 *
              </label>
              <Input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="请输入验证码"
                required
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
                密码 *
              </label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="请输入密码（至少6位）"
                required
              />
              {form.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                        style={{ width: `${(passwordStrength / 4) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">
                      {getPasswordStrengthText()}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认密码 *
              </label>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                placeholder="请再次输入密码"
                required
              />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">密码不一致</p>
              )}
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                checked={form.agreeTerms}
                onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                required
              />
              <span className="ml-2 text-sm text-gray-600">
                我已阅读并同意
                <Link to="/terms" className="text-blue-600 hover:text-blue-500">
                  用户协议
                </Link>
                和
                <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
                  隐私政策
                </Link>
              </span>
            </div>

            <Button
              type="submit"
              className="w-full"
              loading={isLoading}
              disabled={!form.agreeTerms}
            >
              注册
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-600">已有账户？</span>
            <Link
              to="/login"
              className="ml-1 text-blue-600 hover:text-blue-500 font-medium"
            >
              立即登录
            </Link>
          </div>
        </Card>
      </FadeIn>
    </div>
  )
}

export default Register