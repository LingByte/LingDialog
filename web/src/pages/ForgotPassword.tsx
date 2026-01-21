import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/auth'
import Button from '@/components/UI/Button'
import Input from '@/components/UI/Input'
import Card from '@/components/UI/Card'
import FadeIn from '@/components/Animations/FadeIn'
import toast from 'react-hot-toast'

interface ResetForm {
  email: string
  code: string
  newPassword: string
  confirmPassword: string
}

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'reset'>('email')
  const [form, setForm] = useState<ResetForm>({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [countdown, setCountdown] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email) {
      toast.error('请输入邮箱地址')
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.sendEmailCode({
        email: form.email,
        type: 'reset'
      })

      if (response.code === 200) {
        toast.success('重置密码的验证码已发送到您的邮箱')
        setStep('reset')
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
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.code || !form.newPassword || !form.confirmPassword) {
      toast.error('请填写所有字段')
      return
    }

    if (form.newPassword !== form.confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    if (form.newPassword.length < 6) {
      toast.error('密码长度至少6位')
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.resetPassword({
        email: form.email,
        code: form.code,
        newPassword: form.newPassword
      })

      if (response.code === 200) {
        toast.success('密码重置成功，请使用新密码登录')
        navigate('/login')
      } else {
        toast.error(response.msg || '密码重置失败')
      }
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.response?.data?.msg || '密码重置失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    try {
      const response = await authApi.sendEmailCode({
        email: form.email,
        type: 'reset'
      })

      if (response.code === 200) {
        toast.success('验证码已重新发送')
        setCountdown(60)
        
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
      console.error('Resend code error:', error)
      toast.error(error.response?.data?.msg || '发送验证码失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <FadeIn>
        <Card className="w-full max-w-lg p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {step === 'email' ? '忘记密码' : '重置密码'}
            </h1>
            <p className="text-gray-600">
              {step === 'email' 
                ? '输入您的邮箱地址，我们将发送重置密码的验证码' 
                : '输入验证码和新密码来重置您的密码'
              }
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱地址
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="请输入您的邮箱地址"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
              >
                发送验证码
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  返回登录
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱地址
                </label>
                <Input
                  type="email"
                  value={form.email}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  验证码
                </label>
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="请输入验证码"
                    required
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendCode}
                    disabled={countdown > 0}
                    className="whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : '重新发送'}
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <Input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="请输入新密码（至少6位）"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  确认新密码
                </label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="请再次输入新密码"
                  required
                />
                {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">密码不一致</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
              >
                重置密码
              </Button>

              <div className="text-center space-x-4">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-sm text-gray-600 hover:text-gray-500"
                >
                  返回上一步
                </button>
                <Link
                  to="/login"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  返回登录
                </Link>
              </div>
            </form>
          )}
        </Card>
      </FadeIn>
    </div>
  )
}

export default ForgotPassword