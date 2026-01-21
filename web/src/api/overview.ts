import { get } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface OverviewConfig {
  [key: string]: any
}

export interface OrganizationStats {
  [key: string]: any
}

export const getOverviewConfig = async (organizationId: number): Promise<ApiResponse<OverviewConfig>> => {
  return get(`/overview/config/${organizationId}`)
}

export const getOrganizationStats = async (organizationId: number): Promise<ApiResponse<OrganizationStats>> => {
  return get(`/overview/stats/${organizationId}`)
}

