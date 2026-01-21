import { ReactNode, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
}

const ProtectedRoute = ({ children, requireAuth = true }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // 如果正在加载，等待加载完成
    if (isLoading) return

    // 如果需要认证但用户未登录
    if (requireAuth && !isAuthenticated) {
      // 保存当前路径，登录后可以跳转回来
      const currentPath = location.pathname + location.search
      localStorage.setItem('redirectAfterLogin', currentPath)
      
      // 跳转到登录页面
      navigate('/login', { replace: true })
    }

    // 如果不需要认证但用户已登录，对于登录相关页面重定向到首页
    if (!requireAuth && isAuthenticated) {
      if (['/login', '/register', '/forgot-password'].includes(location.pathname)) {
        const redirectPath = localStorage.getItem('redirectAfterLogin') || '/'
        localStorage.removeItem('redirectAfterLogin')
        navigate(redirectPath, { replace: true })
      }
    }
  }, [isAuthenticated, isLoading, requireAuth, navigate, location])

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // 如果需要认证但用户未登录，不渲染内容
  if (requireAuth && !isAuthenticated) {
    return null
  }

  return <>{children}</>
}

export default ProtectedRoute
