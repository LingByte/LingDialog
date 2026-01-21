import { post, get, put } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName?: string
  lastName?: string
  displayName?: string
}

export interface User {
  id: number
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  displayName?: string
  avatar?: string
  role?: string
  permissions?: string
  enabled?: boolean
  createdAt: string
  updatedAt: string
  gender?: string
  city?: string
  region?: string
  country?: string
  timezone?: string
  locale?: string
  profileComplete?: number
  loginCount?: number
  lastLogin?: string
  emailVerified?: boolean
  phoneVerified?: boolean
}

export interface LoginWithPasswordRequest {
  email: string
  password: string
  timezone?: string
  remember?: boolean
  authToken?: boolean
  twoFactorCode?: string
}

export interface LoginWithEmailCodeRequest {
  email: string
  code: string
  timezone?: string
  remember?: boolean
  authToken?: boolean
}

export interface RegisterUserByEmailRequest {
  email: string
  code?: string
  password: string
  displayName?: string
  firstName?: string
  lastName?: string
  captchaId?: string
  captchaCode?: string
}

export interface SendEmailCodeRequest {
  email: string
  type?: 'login' | 'register' | 'reset'
}

export interface ResetPasswordRequest {
  email: string
  code: string
  newPassword: string
}

export interface UpdateProfileRequest {
  displayName?: string
  firstName?: string
  lastName?: string
  phone?: string
  avatar?: string
  gender?: string
  city?: string
  region?: string
  country?: string
  timezone?: string
  locale?: string
}

export interface CaptchaResponse {
  id: string
  image: string
}

export const authApi = {
  login: (data: LoginRequest): Promise<ApiResponse<{ user: User; token: string }>> => {
    return post('/auth/login', data)
  },
  
  register: (data: RegisterRequest): Promise<ApiResponse<{ user: User; token: string }>> => {
    return post('/auth/register', data)
  },
  
  logout: (): Promise<ApiResponse<boolean>> => {
    return get('/auth/logout')
  },
  
  getCurrentUser: (): Promise<ApiResponse<User>> => {
    return get('/user/me')
  },
  
  loginWithPassword: (data: LoginWithPasswordRequest): Promise<ApiResponse<{ user: User; token: string }>> => {
    return post('/auth/login/password', data)
  },
  
  loginWithEmailCode: (data: LoginWithEmailCodeRequest): Promise<ApiResponse<{ user: User; token: string }>> => {
    return post('/auth/login/email', data)
  },
  
  registerUserByEmail: (data: RegisterUserByEmailRequest): Promise<ApiResponse<{ user: User; token: string }>> => {
    return post('/auth/register', data)
  },
  
  sendEmailCode: (data: SendEmailCodeRequest): Promise<ApiResponse<boolean>> => {
    return post('/auth/email/code', data)
  },
  
  resetPassword: (data: ResetPasswordRequest): Promise<ApiResponse<boolean>> => {
    return post('/auth/reset-password', data)
  },
  
  updateProfile: (data: UpdateProfileRequest): Promise<ApiResponse<{ user: User }>> => {
    return put('/user/profile', data)
  },
  
  getCaptcha: (): Promise<ApiResponse<CaptchaResponse>> => {
    return get('/auth/captcha')
  },
}

// 导出便捷函数以保持向后兼容
export const loginWithPassword = authApi.loginWithPassword
export const loginWithEmailCode = authApi.loginWithEmailCode
export const registerUserByEmail = authApi.registerUserByEmail
export const registerUser = authApi.register
export const sendEmailCode = authApi.sendEmailCode
export const getCaptcha = authApi.getCaptcha

