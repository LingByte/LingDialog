import { get } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface Group {
  id: number
  name: string
  description?: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export const getGroupList = async (): Promise<ApiResponse<Group[]>> => {
  return get('/group')
}

export const getGroup = async (id: number): Promise<ApiResponse<Group>> => {
  return get(`/group/${id}`)
}

