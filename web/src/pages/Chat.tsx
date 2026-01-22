import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, User, BookOpen, ChevronDown, MessageSquare, Plus, BarChart3, Clock, Zap, Sparkles, Star, TrendingUp, Brain, Palette, Globe, ChevronLeft, ChevronRight, AlertCircle, Mic, Image, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, chatStream, ChatMessage, ChatSession } from '@/api/chat';
import { novelsApi, Novel } from '@/api/novels';
import { useAuthStore } from '@/stores/authStore';

interface MessageWithTimestamp extends ChatMessage {
    timestamp?: Date;
}

export default function Chat() {
    const { isAuthenticated, token, isLoading, initializeAuth } = useAuthStore();
    
    const [messages, setMessages] = useState<MessageWithTimestamp[]>([]);
    const [input, setInput] = useState('');
    const [isLoadingChat, setIsLoadingChat] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [novels, setNovels] = useState<Novel[]>([]);
    const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
    const [showNovelSelector, setShowNovelSelector] = useState(false);
    const [loadingNovels, setLoadingNovels] = useState(false);
    
    // 会话管理
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
    const [loadingSessions, setLoadingSessions] = useState(false);
    
    // 使用统计
    const [usageStats, setUsageStats] = useState<any>(null);
    
    // UI 状态
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [activeTab, setActiveTab] = useState<'sessions' | 'novels' | 'stats'>('sessions');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const hasLoadedData = useRef(false);

    // 调试信息 - 只在组件挂载时打印一次，避免无限循环
    useEffect(() => {
        console.log('Chat组件挂载');
    }, []); // 移除依赖，只在挂载时执行一次

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 初始化数据 - 使用一个简单的标记来避免重复加载
    useEffect(() => {
        if (isAuthenticated && !isLoading && !hasLoadedData.current) {
            console.log('认证成功，首次加载数据...');
            hasLoadedData.current = true;
            loadNovels();
            loadSessions();
            loadUsageStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, isLoading]); // 依赖认证状态和加载状态

    // 点击外部关闭下拉菜单
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (showNovelSelector && !target.closest('.novel-selector')) {
                setShowNovelSelector(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showNovelSelector]);

    const loadNovels = async () => {
        if (!isAuthenticated || isLoading) return;
        
        try {
            setLoadingNovels(true);
            console.log('开始加载小说列表...');
            const response = await novelsApi.queryNovels({
                pos: 0,
                limit: 100,
                orders: [{ name: 'updatedAt', op: 'desc' }]
            });
            console.log('小说列表加载成功:', response.data.items.length);
            setNovels(response.data.items);
        } catch (error: any) {
            console.error('加载小说列表失败:', error);
            // 不显示 401 错误的 toast，因为会由 axios 拦截器处理
            if (error.response?.status !== 401) {
                toast.error('加载小说列表失败');
            }
        } finally {
            setLoadingNovels(false);
        }
    };

    const loadSessions = async () => {
        if (!isAuthenticated || isLoading) return;
        
        try {
            setLoadingSessions(true);
            console.log('开始加载会话列表...');
            const response = await chatApi.getSessions({ pageSize: 50 });
            console.log('会话列表加载成功:', response.data.sessions.length);
            setSessions(response.data.sessions);
        } catch (error: any) {
            console.error('加载会话列表失败:', error);
            // 不显示 401 错误的 toast，因为会由 axios 拦截器处理
            if (error.response?.status !== 401) {
                toast.error('加载会话列表失败');
            }
        } finally {
            setLoadingSessions(false);
        }
    };

    const loadUsageStats = async () => {
        if (!isAuthenticated || isLoading) return;
        
        try {
            console.log('开始加载使用统计...');
            const response = await chatApi.getUsageStats(7);
            console.log('使用统计加载成功:', response.data);
            setUsageStats(response.data);
        } catch (error: any) {
            console.error('加载使用统计失败:', error);
            // 统计数据加载失败不显示错误提示，因为这不是关键功能
        }
    };

    const loadSessionMessages = async (session: ChatSession) => {
        try {
            const response = await chatApi.getSessionMessages(session.id);
            const sessionMessages = response.data.messages.map(msg => ({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: msg.content,
                timestamp: new Date(msg.createdAt),
            }));
            setMessages(sessionMessages);
            setCurrentSession(session);
            
            // 如果会话关联了小说，自动选择该小说
            if (session.novelId && session.novel) {
                const novel = novels.find(n => n.id === session.novelId);
                if (novel) {
                    setSelectedNovel(novel);
                }
            }
        } catch (error: any) {
            console.error('加载会话消息失败:', error);
            toast.error('加载会话消息失败');
        }
    };

    const handleNovelSelect = (novel: Novel) => {
        setSelectedNovel(novel);
        setShowNovelSelector(false);
        
        // 开始新会话
        startNewSession(novel || undefined);
    };

    const startNewSession = (novel?: Novel) => {
        setMessages([]);
        setCurrentSession(null);
        
        if (novel) {
            // 添加欢迎消息
            const welcomeMessage: MessageWithTimestamp = {
                role: 'assistant',
                content: `🎉 欢迎来到《${novel.title}》的创作工坊！\n\n我是您的专属AI创作助手，对这本小说了如指掌：\n\n📚 **作品信息**\n• 标题：${novel.title}\n• 类型：${novel.genre || '待定'}\n• 简介：${novel.description || '等待您的精彩构思'}\n• 世界观：${novel.worldSetting || '无限可能的世界'}\n\n✨ **我能为您做什么？**\n🎭 角色塑造与发展弧线设计\n📖 情节推进与转折点构思\n🌍 世界观扩展与细节完善\n💡 创意灵感与写作建议\n📝 章节规划与结构优化\n\n让我们一起创造属于您的文学杰作吧！有什么想法尽管告诉我～`,
                timestamp: new Date(),
            };
            setMessages([welcomeMessage]);
            toast.success(`🎨 已进入《${novel.title}》创作模式`);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoadingChat) return;

        const userMessage: MessageWithTimestamp = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoadingChat(true);
        setIsStreaming(true);

        // 创建一个临时的 assistant 消息用于流式更新
        const assistantMessageIndex = messages.length + 1;
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: '',
            timestamp: new Date(),
        }]);

        let accumulatedContent = '';

        // 构建包含小说上下文的消息
        const contextMessages = messages.map(m => ({ role: m.role, content: m.content }));
        contextMessages.push(userMessage);

        console.log('发送聊天请求:', {
            selectedNovelId: selectedNovel?.id,
            selectedNovelTitle: selectedNovel?.title,
            sessionId: currentSession?.id,
            messageCount: contextMessages.length
        });

        await chatStream(
            contextMessages,
            // onMessage
            (content: string) => {
                accumulatedContent += content;
                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[assistantMessageIndex] = {
                        role: 'assistant',
                        content: accumulatedContent,
                        timestamp: new Date(),
                    };
                    return newMessages;
                });
            },
            // onComplete
            (sessionId?: number) => {
                setIsLoadingChat(false);
                setIsStreaming(false);
                
                // 如果返回了会话ID，更新当前会话
                if (sessionId && !currentSession) {
                    loadSessions(); // 重新加载会话列表
                }
            },
            // onError
            (error: string) => {
                console.error('发送消息失败:', error);
                toast.error(error || '发送消息失败，请重试');
                
                // 移除失败的 assistant 消息
                setMessages(prev => prev.slice(0, -1));
                setIsLoadingChat(false);
                setIsStreaming(false);
            },
            0.7,
            2000,
            selectedNovel?.id,
            currentSession?.id,
            selectedNovel ? `讨论《${selectedNovel.title}》` : '新对话'
        );
    };

    const handleDeleteSession = async (sessionId: number) => {
        try {
            await chatApi.deleteSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            
            if (currentSession?.id === sessionId) {
                setCurrentSession(null);
                setMessages([]);
            }
            
            toast.success('会话已删除');
        } catch (error: any) {
            console.error('删除会话失败:', error);
            toast.error('删除会话失败');
        }
    };

    const handleClearHistory = async () => {
        try {
            await chatApi.clearHistory();
            setSessions([]);
            setCurrentSession(null);
            setMessages([]);
            toast.success('对话历史已清除');
        } catch (error: any) {
            console.error('清除历史失败:', error);
            toast.error(error.msg || '清除历史失败');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 渲染侧边栏内容
    const renderSidebarContent = () => {
        switch (activeTab) {
            case 'sessions':
                return (
                    <div className="flex-1 overflow-y-auto">
                        {loadingSessions ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                                <p className="text-xs">加载对话中...</p>
                            </div>
                        ) : sessions.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-gray-200">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <h3 className="font-medium mb-2 text-sm">还没有对话记录</h3>
                                <p className="text-xs mb-6 leading-relaxed">选择一本小说，开始您的创作之旅</p>
                                <button
                                    onClick={() => setActiveTab('novels')}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-gray-100 rounded-xl text-xs font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    选择小说
                                </button>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className={`group relative p-5 rounded-2xl cursor-pointer transition-all duration-300 ${
                                            currentSession?.id === session.id
                                                ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 shadow-md'
                                                : 'hover:bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:shadow-sm'
                                        }`}
                                        onClick={() => loadSessionMessages(session)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <div className={`w-3 h-3 rounded-full ${
                                                        currentSession?.id === session.id ? 'bg-indigo-500' : 'bg-gray-300'
                                                    }`} />
                                                    <h3 className="font-medium text-gray-900 truncate text-sm">
                                                        {session.title}
                                                    </h3>
                                                </div>
                                                {session.novel && (
                                                    <div className="flex items-center space-x-2 mb-3">
                                                        <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-lg flex items-center justify-center">
                                                            <BookOpen className="w-3 h-3 text-gray-100" />
                                                        </div>
                                                        <span className="text-xs text-emerald-600 font-medium">
                                                            {session.novel.title}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex items-center space-x-6 text-xs text-gray-500">
                                                    <div className="flex items-center space-x-1">
                                                        <MessageSquare className="w-3 h-3" />
                                                        <span>{session.messageCount} 条消息</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Zap className="w-3 h-3" />
                                                        <span>{Math.round(session.totalTokens / 1000)}K tokens</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSession(session.id);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            
            case 'novels':
                return (
                    <div className="flex-1 overflow-y-auto">
                        {loadingNovels ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                                </div>
                                <p className="text-xs text-gray-600">加载小说中...</p>
                            </div>
                        ) : novels.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-emerald-200">
                                    <BookOpen className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="font-medium text-gray-900 mb-2 text-sm">还没有小说作品</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">创建您的第一部小说开始创作</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {novels.map((novel) => (
                                    <div
                                        key={novel.id}
                                        className={`group p-5 rounded-2xl cursor-pointer transition-all duration-300 ${
                                            selectedNovel?.id === novel.id
                                                ? 'bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 shadow-md'
                                                : 'hover:bg-gray-50 border-2 border-transparent hover:border-gray-200 hover:shadow-sm'
                                        }`}
                                        onClick={() => handleNovelSelect(novel)}
                                    >
                                        <div className="flex items-start space-x-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                                selectedNovel?.id === novel.id
                                                    ? 'bg-gradient-to-br from-emerald-500 to-blue-500'
                                                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                            }`}>
                                                <BookOpen className="w-6 h-6 text-gray-900" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 truncate mb-2 text-sm">
                                                    {novel.title}
                                                </h3>
                                                <div className="flex items-center space-x-3 mb-3">
                                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                                                        {novel.genre || '未分类'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(novel.updatedAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {novel.description && (
                                                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                                                        {novel.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            
            case 'stats':
                return (
                    <div className="flex-1 overflow-y-auto p-4">
                        {usageStats ? (
                            <div className="space-y-6">
                                {/* 总览卡片 */}
                                <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100">
                                    <h3 className="font-medium text-violet-900 mb-4 flex items-center text-sm">
                                        <TrendingUp className="w-5 h-5 mr-2" />
                                        本周统计概览
                                    </h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 ">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-emerald-900 text-xs">总消息数</p>
                                                    <p className="text-xl font-bold">
                                                        {usageStats.totalStats.totalMessages}
                                                    </p>
                                                </div>
                                                <MessageSquare className="w-8 h-8 text-indigo-900" />
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 ">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-emerald-900 text-xs">总会话数</p>
                                                    <p className="text-xl font-bold">
                                                        {usageStats.totalStats.totalSessions}
                                                    </p>
                                                </div>
                                                <Brain className="w-8 h-8 text-emerald-900" />
                                            </div>
                                        </div>
                                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-amber-900 text-xs">Token 消耗</p>
                                                    <p className="text-xl font-bold">
                                                        {Math.round(usageStats.totalStats.totalTokens / 1000)}K
                                                    </p>
                                                </div>
                                                <Zap className="w-8 h-8 text-amber-900" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* 每日统计 */}
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                    <h3 className="font-medium text-gray-900 mb-4 flex items-center text-sm">
                                        <BarChart3 className="w-5 h-5 mr-2" />
                                        每日使用情况
                                    </h3>
                                    <div className="space-y-3">
                                        {usageStats.dailyUsage.slice(0, 7).map((day: any) => (
                                            <div key={day.date} className="flex items-center justify-between p-4 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                                                <span className="text-xs font-medium text-gray-700">
                                                    {new Date(day.date).toLocaleDateString('zh-CN', { 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })}
                                                </span>
                                                <div className="flex items-center space-x-4 text-xs">
                                                    <span className="text-indigo-600 font-medium">{day.messageCount} 条消息</span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="text-emerald-600 font-medium">{Math.round(day.totalTokens / 1000)}K tokens</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <BarChart3 className="w-8 h-8 text-violet-500" />
                                </div>
                                <h3 className="font-medium text-gray-900 mb-2 text-sm">暂无统计数据</h3>
                                <p className="text-xs text-gray-500">开始对话后将显示使用统计</p>
                            </div>
                        )}
                    </div>
                );
            
            default:
                return null;
        }
    };

    // 如果用户未登录，显示登录提示
    if (!isAuthenticated && !isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-6">
                <div className="max-w-md mx-auto text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
                        <AlertCircle className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        需要登录才能使用
                    </h2>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        请先登录您的账户，然后就可以开始使用AI创作助手了。
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="w-full px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-indigo-50 rounded-2xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            前往登录
                        </button>
                        <button
                            onClick={() => {
                                console.log('重新初始化认证状态...');
                                initializeAuth();
                            }}
                            className="w-full px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium hover:bg-gray-200 transition-all"
                        >
                            重新检查登录状态
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 如果正在加载认证状态，显示加载页面
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-50 rounded-full animate-spin"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">正在验证登录状态</h2>
                    <p className="text-gray-600">请稍候...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50 to-purple-50">
            <div className="flex h-screen">
                {/* 左侧边栏 */}
                <div className={`bg-gradient-to-b from-gray-50 to-gray-100 backdrop-blur-xl shadow-2xl border-r border-gray-200 flex flex-col transition-all duration-300 ${
                    sidebarCollapsed ? 'w-20' : 'w-96'
                }`}>
                    {/* 侧边栏头部 */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            {!sidebarCollapsed && (
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                        <Brain className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text">
                                            创作工坊
                                        </h2>
                                        <p className="text-xs text-gray-500">AI 智能助手</p>
                                    </div>
                                </div>
                            )}
                            <button
                                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-all"
                            >
                                {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                            </button>
                        </div>
                        
                        {!sidebarCollapsed && (
                            <>
                                {/* 标签页导航 */}
                                <div className="flex mt-6 bg-gray-200 rounded-2xl p-1">
                                    <button
                                        onClick={() => setActiveTab('sessions')}
                                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                                            activeTab === 'sessions'
                                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-indigo-900 shadow-lg'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                                        }`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span>对话</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('novels')}
                                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                                            activeTab === 'novels'
                                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-emerald-900 shadow-lg'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                                        }`}
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        <span>小说</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('stats')}
                                        className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                                            activeTab === 'stats'
                                                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-violet-900 shadow-lg'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-300'
                                        }`}
                                    >
                                        <BarChart3 className="w-4 h-4" />
                                        <span>统计</span>
                                    </button>
                                </div>
                                
                                {/* 新建按钮 */}
                                <button
                                    onClick={() => startNewSession(selectedNovel || undefined)}
                                    className="w-full mt-4 flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r rounded-2xl font-medium text-sm hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Plus className="w-5 h-5" />
                                    <span>新建对话</span>
                                </button>
                            </>
                        )}
                    </div>

                    {/* 侧边栏内容 */}
                    {!sidebarCollapsed && renderSidebarContent()}

                    {/* 侧边栏底部 */}
                    {!sidebarCollapsed && (
                        <div className="p-6 border-t border-gray-200 mt-auto">
                            <button
                                onClick={handleClearHistory}
                                className="w-full flex items-center justify-center space-x-3 px-6 py-3 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-gray-200 hover:border-red-200"
                                disabled={sessions.length === 0}
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>清除所有历史</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* 主聊天区域 */}
                <div className="flex-1 flex flex-col">
                    {/* 顶部导航栏 */}
                    <div className="bg-gradient-to-r from-gray-50 to-indigo-50 backdrop-blur-xl shadow-sm border-b border-gray-200 px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-xl">
                                        <Sparkles className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text">
                                            {currentSession ? currentSession.title : 'AI 创作助手'}
                                        </h1>
                                        <p className="text-xs flex items-center space-x-2">
                                            {selectedNovel ? (
                                                <>
                                                    <BookOpen className="w-4 h-4" />
                                                    <span>正在讨论《{selectedNovel.title}》</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Globe className="w-4 h-4" />
                                                    <span>选择小说开始创作之旅</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center space-x-4">
                                {/* 小说选择器 */}
                                <div className="relative novel-selector">
                                    <button
                                        onClick={() => setShowNovelSelector(!showNovelSelector)}
                                        className="flex items-center space-x-3 px-6 py-3 text-xs text-gray-700 bg-gradient-to-r from-gray-50 to-indigo-50 hover:from-gray-100 hover:to-indigo-100 border border-gray-200 rounded-2xl transition-all shadow-sm hover:shadow-md"
                                        disabled={loadingNovels}
                                    >
                                        <BookOpen className="w-4 h-4" />
                                        <span className="font-medium">{selectedNovel ? selectedNovel.title : '选择小说'}</span>
                                        <ChevronDown className="w-4 h-4" />
                                    </button>
                                    
                                    {showNovelSelector && (
                                        <div className="absolute right-0 top-full mt-3 w-96 bg-gradient-to-b from-gray-50 to-gray-100 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
                                            <div className="p-6 border-b border-gray-200">
                                                <h3 className="font-bold text-gray-900 flex items-center text-base">
                                                    <Palette className="w-5 h-5 mr-3" />
                                                    选择创作主题
                                                </h3>
                                                <p className="text-xs text-gray-600 mt-2">选择一本小说开始AI辅助创作</p>
                                            </div>
                                            {loadingNovels ? (
                                                <div className="p-8 text-center">
                                                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
                                                    <p className="text-sm text-gray-600">加载中...</p>
                                                </div>
                                            ) : novels.length === 0 ? (
                                                <div className="p-8 text-center">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                                        <BookOpen className="w-8 h-8 text-gray-900" />
                                                    </div>
                                                    <p className="text-xs text-gray-600 mb-2">暂无小说作品</p>
                                                    <p className="text-xs text-gray-500">请先创建一本小说</p>
                                                </div>
                                            ) : (
                                                <div className="max-h-80 overflow-y-auto">
                                                    {novels.map((novel) => (
                                                        <button
                                                            key={novel.id}
                                                            onClick={() => handleNovelSelect(novel)}
                                                            className={`w-full text-left p-6 hover:bg-gray-200 transition-all border-b border-gray-200 last:border-b-0 ${
                                                                selectedNovel?.id === novel.id ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200' : ''
                                                            }`}
                                                        >
                                                            <div className="flex items-start space-x-4">
                                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                                                    selectedNovel?.id === novel.id
                                                                        ? 'bg-gradient-to-br from-indigo-500 to-purple-500'
                                                                        : 'bg-gradient-to-br from-gray-400 to-gray-500'
                                                                }`}>
                                                                    <BookOpen className="w-6 h-6 text-gray-900" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium text-gray-900 truncate text-sm">{novel.title}</div>
                                                                    <div className="flex items-center space-x-3 mt-2">
                                                                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                                                                            {novel.genre || '未分类'}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {new Date(novel.updatedAt).toLocaleDateString()}
                                                                        </span>
                                                                    </div>
                                                                    {novel.description && (
                                                                        <div className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">
                                                                            {novel.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 消息区域 */}
                    <div className="flex-1 overflow-y-auto px-8 py-8">
                        {messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="relative mb-12">
                                    <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
                                        <Sparkles className="w-16 h-16" />
                                    </div>
                                    <div className="absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl">
                                        <Star className="w-6 h-6 text-yellow-100" />
                                    </div>
                                </div>
                                
                                {selectedNovel ? (
                                    <div className="max-w-3xl">
                                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
                                            开始创作《{selectedNovel.title}》
                                        </h2>
                                        <p className="text-gray-600 text-lg mb-12 leading-relaxed">
                                            🎨 我是您的专属AI创作助手，拥有丰富的文学知识和创作经验。<br/>
                                            让我们一起探索无限的创作可能，打造属于您的文学杰作！
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-8 mb-12">
                                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100 shadow-lg">
                                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6">
                                                    <Brain className="w-8 h-8" />
                                                </div>
                                                <h3 className="font-bold text-gray-900 mb-3 text-base">智能分析</h3>
                                                <p className="text-gray-600 leading-relaxed text-sm">深度分析情节结构，提供专业的创作建议</p>
                                            </div>
                                            
                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-100 shadow-lg">
                                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mb-6">
                                                    <Palette className="w-8 h-8 text-emerald-100" />
                                                </div>
                                                <h3 className="font-bold text-gray-900 mb-3 text-base">创意激发</h3>
                                                <p className="text-gray-600 leading-relaxed text-sm">激发无限创意灵感，突破创作瓶颈</p>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-8 border border-indigo-100">
                                            <h3 className="font-bold text-indigo-900 mb-6 flex items-center text-lg">
                                                <Sparkles className="w-6 h-6 mr-3" />
                                                创作建议
                                            </h3>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="flex items-center space-x-3 text-indigo-700">
                                                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                                                    <span className="font-medium text-sm">角色性格深度挖掘</span>
                                                </div>
                                                <div className="flex items-center space-x-3 text-purple-700">
                                                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                                    <span className="font-medium text-sm">情节转折点设计</span>
                                                </div>
                                                <div className="flex items-center space-x-3 text-pink-700">
                                                    <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                                                    <span className="font-medium text-sm">世界观细节完善</span>
                                                </div>
                                                <div className="flex items-center space-x-3 text-emerald-700">
                                                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                                    <span className="font-medium text-sm">写作风格优化</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="max-w-2xl">
                                        <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
                                            欢迎来到创作工坊
                                        </h2>
                                        <p className="text-gray-600 text-lg mb-12 leading-relaxed">
                                            选择一本小说，开启您的AI辅助创作之旅。<br/>
                                            让我们一起探索文学的无限可能！
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('novels')}
                                            className="px-12 py-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-indigo-900 rounded-3xl font-bold text-base hover:from-indigo-600 hover:to-purple-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                                        >
                                            选择小说开始创作
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="max-w-5xl mx-auto space-y-8">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex items-start space-x-4 max-w-4xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                            <div className={`flex-shrink-0 w-8 h-8 rounded-3xl flex items-center justify-center shadow-xl ${
                                                message.role === 'user'
                                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                                    : 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500'
                                            }`}>
                                                {message.role === 'user' ? (
                                                    <User className="w-7 h-7" />
                                                ) : (
                                                    <Sparkles className="w-7 h-7 text-purple-900" />
                                                )}
                                            </div>
                                            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                                                <div className={`inline-block px-8 py-6 rounded-3xl shadow-xl ${
                                                    message.role === 'user'
                                                        ? 'bg-gradient-to-r from-indigo-900 to-purple-900 text-indigo-900'
                                                        : 'bg-gradient-to-r from-gray-900 to-indigo-900 text-gray-900 border border-gray-200'
                                                }`}>
                                                    <p className="whitespace-pre-wrap break-words leading-relaxed text-base">{message.content}</p>
                                                </div>
                                                {message.timestamp && (
                                                    <p className="text-xs text-gray-900 mt-1 px-4">
                                                        {message.timestamp.toLocaleTimeString('zh-CN', {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isStreaming && (
                                    <div className="flex justify-start">
                                        <div className="flex items-center space-x-4 text-gray-500">
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-3xl flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                            </div>
                                            <div className="bg-gradient-to-r from-gray-50 to-indigo-50 px-6 py-3 rounded-2xl border border-gray-200 shadow-sm">
                                                <span className="text-xs font-medium">AI 正在创作中...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* 输入区域 */}
                    <div className="bg-gradient-to-r from-gray-50 to-indigo-50 backdrop-blur-xl border-t border-gray-200 px-8 py-6">
                        <div className="max-w-5xl mx-auto">
                            <div className="flex items-end space-x-6">
                                <div className="flex-1 relative">
                                    <textarea
                                        ref={textareaRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={selectedNovel ? `和我讨论《${selectedNovel.title}》的创作灵感... (Shift+Enter 换行)` : "请先选择一本小说，开启创作之旅... (Shift+Enter 换行)"}
                                        className="w-full px-4 py-6 pr-15 border-1 border-gray-200 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400 resize-none bg-gradient-to-r from-gray-50 to-indigo-50 shadow-lg placeholder-gray-500 text-base leading-relaxed"
                                        rows={1}
                                        style={{
                                            minHeight: '60px',
                                            maxHeight: '220px',
                                        }}
                                        disabled={isLoadingChat || !selectedNovel}
                                    />
                                    <div className="absolute right-4 bottom-4 flex items-center space-x-2">
                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-all">
                                            <Paperclip className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-all">
                                            <Image className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-xl transition-all">
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoadingChat || !selectedNovel}
                                    className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-xl hover:shadow-2xl transform hover:-translate-y-1 disabled:transform-none"
                                >
                                    {isLoadingChat ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <Send className="w-6 h-6" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}