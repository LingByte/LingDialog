/**
 * 主题适配工具
 */

export function getThemeClass(lightClass: string, darkClass: string): string {
  return `${lightClass} dark:${darkClass}`
}

export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return document.documentElement.classList.contains('dark')
}

export function toggleTheme(): void {
  if (typeof window === 'undefined') return
  document.documentElement.classList.toggle('dark')
  localStorage.setItem('theme', isDarkMode() ? 'dark' : 'light')
}

export function setTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)
}

export function initTheme(): void {
  if (typeof window === 'undefined') return
  const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  if (savedTheme) {
    setTheme(savedTheme)
  } else if (prefersDark) {
    setTheme('dark')
  } else {
    setTheme('light')
  }
}

export function getCurrentTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return isDarkMode() ? 'dark' : 'light'
}

export function getThemeClasses(theme: 'light' | 'dark', _color: 'primary' | 'secondary' = 'primary') {
  if (theme === 'dark') {
    return {
      bg: 'bg-blue-600',
      text: 'text-white',
      hover: 'hover:bg-blue-700',
      ring: 'blue-500'
    }
  }
  return {
    bg: 'bg-blue-600',
    text: 'text-white',
    hover: 'hover:bg-blue-700',
    ring: 'blue-500'
  }
}

export function createThemeAwareStyles(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    return {
      card: {
        default: 'bg-gray-800 border border-gray-700 shadow-lg',
        elevated: 'bg-gray-800 border border-gray-700 shadow-2xl',
        filled: 'bg-gray-800 border border-gray-700',
        glass: 'bg-gray-800/50 backdrop-blur-md border border-gray-700/50'
      }
    }
  }
  return {
    card: {
      default: 'bg-white border border-gray-200 shadow-md',
      elevated: 'bg-white border border-gray-200 shadow-xl',
      filled: 'bg-gray-50 border border-gray-200',
      glass: 'bg-white/50 backdrop-blur-md border border-gray-200/50'
    }
  }
}

