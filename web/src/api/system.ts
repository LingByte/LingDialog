import { get } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface SystemInfo {
  version: string
  environment: string
}

export interface SystemInitInfo {
  email: {
    configured: boolean
  }
  database: {
    isMemoryDB: boolean
  }
}

export const systemApi = {
  getSystemInfo: (): Promise<ApiResponse<SystemInfo>> => {
    return get('/system/info')
  },
  
  getSystemInit: (): Promise<ApiResponse<SystemInitInfo>> => {
    return get('/system/init')
  },
}

