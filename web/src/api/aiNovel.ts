import { post } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface GenerateNovelSettingRequest {
  genre: string
  fixedFields?: string[]
  title?: string
  description?: string
  worldSetting?: string
  tags?: string
  feedback?: string
}

export interface GenerateNovelSettingResponse {
  title: string
  description: string
  worldSetting: string
  tags: string
}

export const aiNovelApi = {
  // 生成小说设定
  generateSetting: (data: GenerateNovelSettingRequest): Promise<ApiResponse<GenerateNovelSettingResponse>> => {
    return post('/ai/novel/generate-setting', data)
  },
}
