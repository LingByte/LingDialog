import { cn } from '@/utils/cn'

interface TabItem {
  value: string
  label: string
}

interface SimpleTabsProps {
  value: string
  onValueChange: (value: string) => void
  items: TabItem[]
  className?: string
}

export default function SimpleTabs({ value, onValueChange, items, className }: SimpleTabsProps) {
  return (
    <div className={cn('border-b border-gray-200 dark:border-gray-700', className)}>
      <div className="flex space-x-8">
        {items.map((item) => (
          <button
            key={item.value}
            onClick={() => onValueChange(item.value)}
            className={cn(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              value === item.value
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
