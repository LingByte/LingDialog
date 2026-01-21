import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type User, type RegisterRequest } from '../api/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  currentOrganizationId: number | null
  login: (token: string, user?: User) => Promise<boolean>
  register: (data: RegisterRequest) => Promise<boolean>
  logout: (next?: string) => Promise<void>
  setLoading: (loading: boolean) => void
  refreshUserInfo: () => Promise<void>
  updateProfile: (data: Partial<User>) => void
  clearUser: () => void
  setCurrentOrganization: (organizationId: number | null) => void
  initializeAuth: () => Promise<void>
}

// @ts-ignore
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      currentOrganizationId: null,

      login: async (token: string, user?: User) => {
        set({ isLoading: true })
        try {
          // 存储token到localStorage和状态中
          localStorage.setItem('auth_token', token)
          
          set({
            isAuthenticated: true, 
            isLoading: false,
            token: token
          })
          
          // 如果已经有用户信息，直接使用
          if (user) {
            set({ user })
            return true
          }
          
          // 否则从API获取用户信息
          const userResponse = await authApi.getCurrentUser()
          if (userResponse.code === 200) {
            set({
              user: userResponse.data
            })
            return true
          } else {
            throw new Error(userResponse.msg || '获取用户信息失败')
          }
        } catch (error) {
          set({ isLoading: false, isAuthenticated: false, token: null, user: null })
          localStorage.removeItem('auth_token')
          console.error('Login failed:', error)
          return false
        }
      },

      register: async (data: RegisterRequest) => {
        set({ isLoading: true })
        try {
          const response = await authApi.register(data)
          
          if (response.code === 200) {
            // 注册成功，但通常注册后需要用户主动登录
            set({ isLoading: false })
            return true
          } else {
            throw new Error(response.msg || '注册失败')
          }
        } catch (error) {
          set({ isLoading: false })
          console.error('Registration failed:', error)
          return false
        }
      },

      logout: async (_next?: string) => {
        try {
          // 调用登出API
          const response = await authApi.logout()
          if (response.code !== 200) {
            console.warn('Logout API warning:', response.msg)
          }
        } catch (error) {
          console.error('Logout API error:', error)
        } finally {
          // 清除本地存储和状态
          localStorage.removeItem('auth_token')
          set({ user: null, isAuthenticated: false, token: null, currentOrganizationId: null })
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      refreshUserInfo: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          set({ user: null, isAuthenticated: false, token: null })
          return
        }

        try {
          const response = await authApi.getCurrentUser()
          if (response.code === 200) {
            set({ user: response.data, isAuthenticated: true, token })
          } else {
            throw new Error(response.msg || '获取用户信息失败')
          }
        } catch (error) {
          console.error('Failed to refresh user info:', error)
          // 如果获取用户信息失败，清除认证状态
          localStorage.removeItem('auth_token')
          set({ user: null, isAuthenticated: false, token: null })
        }
      },

      updateProfile: (data: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...data } })
        }
      },

      // 新增的清除用户信息方法
      clearUser: () => {
        localStorage.removeItem('auth_token')
        set({ user: null, isAuthenticated: false, token: null, currentOrganizationId: null })
      },

      // 设置当前选择的组织
      setCurrentOrganization: (organizationId: number | null) => {
        set({ currentOrganizationId: organizationId })
      },

      // 初始化认证状态
      initializeAuth: async () => {
        const token = localStorage.getItem('auth_token')
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null, isLoading: false })
          return
        }

        set({ isLoading: true })
        try {
          const response = await authApi.getCurrentUser()
          if (response.code === 200) {
            set({ 
              user: response.data, 
              isAuthenticated: true, 
              token,
              isLoading: false 
            })
          } else {
            // token无效，清除
            localStorage.removeItem('auth_token')
            set({ user: null, isAuthenticated: false, token: null, isLoading: false })
          }
        } catch (error) {
          console.error('Failed to initialize auth:', error)
          localStorage.removeItem('auth_token')
          set({ user: null, isAuthenticated: false, token: null, isLoading: false })
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        currentOrganizationId: state.currentOrganizationId
      }),
    }
  )
)

// 导出User类型供其他组件使用
export type { User }