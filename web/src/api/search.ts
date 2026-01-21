import { post } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface SearchRequest {
  keyword: string
  filters?: Record<string, any>
  size?: number
  from?: number
  highlight?: boolean
  highlightFields?: string[]
  fragmentSize?: number
  maxFragments?: number
}

export interface SearchResult {
  total: number
  hits: Array<{
    id: string
    score: number
    fields: Record<string, any>
  }>
}

export const searchApi = {
  search: (data: SearchRequest): Promise<ApiResponse<SearchResult>> => {
    return post('/search', data)
  },
}

