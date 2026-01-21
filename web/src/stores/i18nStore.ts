import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Language = 'zh' | 'en' | 'ja'

interface I18nState {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

// 简化的翻译store，直接返回key
export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: 'zh',
      
      setLanguage: (lang: Language) => {
        set({ language: lang })
      },
      
      t: (key: string, _params?: Record<string, string | number>) => {
        // 简化版本，直接返回key，如果需要翻译可以后续添加
        return key
      },
    }),
    {
      name: 'i18n-storage',
    }
  )
)
