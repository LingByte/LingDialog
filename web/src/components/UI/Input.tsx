import {
    forwardRef,
    useEffect,
    useId,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { Eye, EyeOff, X, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'


type Size = 'sm' | 'md' | 'lg' | 'xl'

// 以 HTMLMotionProps<'input'> 作为基础，移除我们要自定义的 size
type BaseMotionInputProps = Omit<HTMLMotionProps<'input'>, 'size'>

// 我们的最终 Props：在 Base 上扩展并覆盖 onChange 的签名
interface InputProps extends BaseMotionInputProps {
    label?: string
    error?: string
    helperText?: string
    leftIcon?: React.ReactNode
    rightIcon?: React.ReactNode
    clearable?: boolean
    onClear?: () => void
    size?: Size
    loading?: boolean
    showCount?: boolean
    countMax?: number
    onValueChange?: (value: string) => void
    changeDebounceMs?: number
    wrapperClassName?: string
    inputClassName?: string
    variant?: 'default' | 'filled' | 'glass' | 'minimal'
    // 关键：覆盖 onChange 的类型，供内部解构与调用
    onChange?: React.ChangeEventHandler<HTMLInputElement>
}

const sizeMap: Record<Size, { px: string; py: string; text: string; icon: string; height: string }> = {
    sm: { px: 'px-3',   py: 'py-2',   text: 'text-sm',  icon: 'w-4 h-4', height: 'h-10' },
    md: { px: 'px-4',   py: 'py-3',   text: 'text-base',icon: 'w-5 h-5', height: 'h-12' },
    lg: { px: 'px-5',   py: 'py-4',   text: 'text-lg',  icon: 'w-5 h-5', height: 'h-14' },
    xl: { px: 'px-6',   py: 'py-5',   text: 'text-xl',  icon: 'w-6 h-6', height: 'h-16' },
}

const variantStyles = {
    default: {
        base: 'bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
        disabled: 'bg-gray-50 border-gray-200',
        error: 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
    },
    filled: {
        base: 'bg-gray-50 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
        disabled: 'bg-gray-100 border-transparent',
        error: 'bg-red-50 border-red-500 focus:bg-white focus:border-red-500 focus:ring-red-500/20'
    },
    glass: {
        base: 'bg-white/10 border border-white/20 backdrop-blur-sm focus:bg-white/20 focus:border-white/40 focus:ring-2 focus:ring-white/20 text-white placeholder-white/60',
        disabled: 'bg-white/5 border-white/10 text-white/50',
        error: 'bg-red-500/10 border-red-400/50 focus:border-red-400 focus:ring-red-400/20'
    },
    minimal: {
        base: 'bg-transparent border-0 border-b-2 border-gray-300 rounded-none focus:border-blue-500 focus:ring-0 px-0',
        disabled: 'border-gray-200 text-gray-400',
        error: 'border-red-500 focus:border-red-500'
    }
}

// 简易节流
function useDebouncedCallback<T extends (...args: any[]) => void>(cb: T | undefined, delay = 0) {
    const timer = useRef<number | null>(null)
    return (...args: Parameters<T>) => {
        if (!cb) return
        if (delay <= 0) return cb(...args)
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => cb(...args), delay)
    }
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
    {
        className,
        inputClassName,
        wrapperClassName,
        type = 'text',
        label,
        error,
        helperText,
        leftIcon,
        rightIcon,
        clearable = false,
        onClear,
        value,
        defaultValue,
        onChange,
        onValueChange,
        size = 'md',
        variant = 'default',
        loading = false,
        showCount = false,
        countMax,
        maxLength,
        disabled,
        readOnly,
        changeDebounceMs = 0,
        ...restProps // 其余作为 HTMLMotionProps<'input'> 传给 motion.input
    },
    ref
) {
    const generatedId = useId()
    const inputId = restProps.id ?? `input-${generatedId}`
    const errorId = `${inputId}-error`
    const helpId = `${inputId}-help`

    const isControlled = value !== undefined
    const [inner, setInner] = useState<string>(String(defaultValue ?? ''))
    const currentValue = String(isControlled ? value ?? '' : inner)

    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

    const inputRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)

    // 触发外部回调（可加节流）
    const emitChange = useDebouncedCallback((val: string, e?: React.ChangeEvent<HTMLInputElement>) => {
        onValueChange?.(val)
        onChange?.(e as any)
    }, changeDebounceMs)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        if (!isControlled) setInner(val)
        emitChange(val, e)
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true)
        restProps.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false)
        restProps.onBlur?.(e)
    }

    const handleClear = () => {
        if (onClear) {
            onClear()
            return
        }
        if (!isControlled) setInner('')
        const event = new Event('input', { bubbles: true })
        if (inputRef.current) {
            inputRef.current.value = ''
            inputRef.current.dispatchEvent(event)
        }
        onValueChange?.('')
    }

    const inputType = type === 'password' && showPassword ? 'text' : type
    const hasValue = currentValue.length > 0
    const hasRightAction = loading || clearable || type === 'password' || rightIcon

    const sizeTokens = sizeMap[size]
    const variantClasses = variantStyles[variant]

    const countCurrent = useMemo(() => currentValue.length, [currentValue])
    const countLimit = countMax ?? maxLength

    const describedBy =
        [
            error ? errorId : null,
            helperText ? helpId : null,
            restProps['aria-describedby'] ?? null,
        ]
            .filter(Boolean)
            .join(' ') || undefined

    // 获取输入框样式
    const getInputStyles = () => {
        if (error) return variantClasses.error
        if (disabled) return variantClasses.disabled
        return variantClasses.base
    }

    useEffect(() => {
        return () => {}
    }, [])

    return (
        <div className={clsx('w-full', wrapperClassName)}>
            {label && (
                <motion.label
                    htmlFor={inputId}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                        'mb-2 block text-sm font-medium transition-colors duration-200',
                        variant === 'glass' ? 'text-white/90' : 'text-gray-700',
                        isFocused && !error && (variant === 'glass' ? 'text-white' : 'text-blue-600'),
                        error && 'text-red-600'
                    )}
                >
                    {label}
                    {restProps.required && <span className="ml-1 text-red-500">*</span>}
                </motion.label>
            )}

            <div className="relative group">
                {leftIcon && (
                    <div className={clsx(
                        'pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors duration-200',
                        sizeTokens.px,
                        variant === 'glass' ? 'text-white/50' : 'text-gray-400',
                        isFocused && !error && (variant === 'glass' ? 'text-white/80' : 'text-blue-500'),
                        error && 'text-red-500'
                    )}>
                        {leftIcon}
                    </div>
                )}

                <motion.input
                    ref={inputRef}
                    id={inputId}
                    type={inputType}
                    value={currentValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    disabled={disabled || loading}
                    readOnly={readOnly}
                    aria-invalid={!!error || undefined}
                    aria-describedby={describedBy}
                    className={clsx(
                        'w-full rounded-xl transition-all duration-300 outline-none',
                        sizeTokens.height,
                        sizeTokens.text,
                        leftIcon ? 'pl-12' : sizeTokens.px,
                        hasRightAction ? 'pr-12' : sizeTokens.px,
                        variant !== 'minimal' && sizeTokens.py,
                        getInputStyles(),
                        disabled && 'cursor-not-allowed opacity-60',
                        readOnly && 'cursor-default',
                        'group-hover:shadow-sm',
                        isFocused && 'shadow-lg',
                        inputClassName,
                        className
                    )}
                    initial={{ scale: 0.98 }}
                    animate={{ scale: 1 }}
                    whileFocus={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                    // 把剩余属性（已是 HTMLMotionProps<'input'>）传下去，避免 MotionProps 冲突
                    {...(restProps as HTMLMotionProps<'input'>)}
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                            <Loader2 className={clsx(
                                'animate-spin',
                                sizeTokens.icon,
                                variant === 'glass' ? 'text-white/60' : 'text-gray-400'
                            )} />
                        </motion.div>
                    )}

                    {clearable && hasValue && !readOnly && !disabled && (
                        <motion.button
                            type="button"
                            aria-label="清空输入"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleClear}
                            className={clsx(
                                'p-1 rounded-full transition-colors duration-200',
                                variant === 'glass' 
                                    ? 'text-white/50 hover:text-white/80 hover:bg-white/10' 
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            )}
                        >
                            <X className="w-4 h-4" />
                        </motion.button>
                    )}

                    {type === 'password' && !readOnly && (
                        <motion.button
                            type="button"
                            aria-label={showPassword ? '隐藏密码' : '显示密码'}
                            aria-pressed={showPassword}
                            title={showPassword ? '隐藏密码' : '显示密码'}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setShowPassword(v => !v)}
                            className={clsx(
                                'p-1 rounded-full transition-colors duration-200',
                                variant === 'glass' 
                                    ? 'text-white/50 hover:text-white/80 hover:bg-white/10' 
                                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            )}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </motion.button>
                    )}

                    {!loading && type !== 'password' && !clearable && rightIcon && (
                        <span className={clsx(
                            'transition-colors duration-200',
                            variant === 'glass' ? 'text-white/50' : 'text-gray-400',
                            isFocused && !error && (variant === 'glass' ? 'text-white/80' : 'text-blue-500')
                        )}>
                            {rightIcon}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    {error ? (
                        <motion.p
                            id={errorId}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-sm text-red-600 flex items-center gap-1"
                        >
                            <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                            {error}
                        </motion.p>
                    ) : helperText ? (
                        <motion.p
                            id={helpId}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={clsx(
                                'text-sm',
                                variant === 'glass' ? 'text-white/60' : 'text-gray-500'
                            )}
                        >
                            {helperText}
                        </motion.p>
                    ) : null}
                </div>

                {showCount && (type === 'text' || type === 'search' || type === 'password') && (
                    <div
                        className={clsx(
                            'text-xs tabular-nums font-medium',
                            countLimit && countCurrent > (countLimit || 0)
                                ? 'text-red-500'
                                : variant === 'glass' 
                                    ? 'text-white/60' 
                                    : 'text-gray-400'
                        )}
                        title="字符统计"
                    >
                        {countCurrent}
                        {countLimit ? ` / ${countLimit}` : null}
                    </div>
                )}
            </div>
        </div>
    )
})

Input.displayName = 'Input'

export default Input
