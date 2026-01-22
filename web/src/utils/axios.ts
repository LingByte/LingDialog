import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '../stores/authStore'
import { getApiBaseURL } from '../config/apiConfig'

// 获取API基础URL
const getApiBaseUrl = () => {
  return getApiBaseURL()
}

// 创建axios实例
const axiosInstance: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 300000, // 5分钟超时，适合 AI 生成等耗时操作
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 添加认证token
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('请求携带token:', { 
        url: config.url, 
        hasToken: !!token, 
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...'
      })
    } else {
      console.log('请求未携带token:', { url: config.url })
    }
    
    // 如果是FormData，让浏览器自动设置Content-Type（包含boundary）
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    // 添加请求时间戳
    if (config.params) {
      config.params._t = Date.now()
    } else {
      config.params = { _t: Date.now() }
    }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器 - 只处理通用错误，不处理业务逻辑
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 直接返回完整响应，让业务层处理
    return response
  },
  (error) => {
      console.error('Response interceptor error:', error)
    // 处理网络错误和HTTP状态码错误
    if (error.response) {
        console.log('Response status:', error.response.status)
      // 服务器返回了错误状态码
      const status = error.response.status

      switch (status) {
        case 401:
            console.log('Unauthorized')
            // 不要自动清除用户状态，让组件自己处理
            // useAuthStore.getState().clearUser()
            console.log('Unauthorized: Please log in')
          break
        case 403:
          console.error('Forbidden: Access denied')
          break
        case 404:
          console.error('Not Found: API endpoint not found')
          break
        case 500:
          console.error('Internal Server Error')
          break
        default:
          console.error(`HTTP Error ${status}:`, error.response.data)
      }
    } else if (error.request) {
      // 网络错误 - 连接被拒绝或超时
      console.error('Network Error:', error.message)
    } else {
      // 其他错误
      console.error('Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

export default axiosInstance
