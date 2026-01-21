import { get, post } from '@/utils/request'
import { ApiResponse } from '@/utils/request'

export interface Notification {
  id: number
  title: string
  message?: string
  type: string
  read: boolean
  createdAt: string
}

export const notificationApi = {
  getNotifications: (): Promise<ApiResponse<Notification[]>> => {
    return get('/notification')
  },
  
  markAsRead: (id: number): Promise<ApiResponse<boolean>> => {
    return post(`/notification/${id}/read`, {})
  },
}

// 导出便捷函数
export const getNotifications = notificationApi.getNotifications
export const getUnreadNotificationCount = async (): Promise<ApiResponse<number>> => {
  const response = await getNotifications()
  if (response.code === 200) {
    const unreadCount = response.data.filter(n => !n.read).length
    return { code: 200, msg: 'success', data: unreadCount }
  }
  return { code: response.code, msg: response.msg, data: 0 }
}
export const markAllNotificationsAsRead = async (): Promise<ApiResponse<boolean>> => {
  return post('/notification/read-all', {})
}
export const markNotificationAsRead = notificationApi.markAsRead
export const deleteNotification = async (id: number): Promise<ApiResponse<boolean>> => {
  return post(`/notification/${id}/delete`, {})
}
export const batchDeleteNotifications = async (ids: number[]): Promise<ApiResponse<boolean>> => {
  return post('/notification/batch-delete', { ids })
}

