import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User, BookOpen, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, chatStream, ChatMessage } from '@/api/chat';
import { novelsApi, Novel } from '@/api/novels';

interface MessageWithTimestamp extends ChatMessage {
    timestamp?: Date;
}

export default function Chat() {
    const [messages, setMessages] = useState<MessageWithTimestamp[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [novels, setNovels] = useState<Novel[]>([]);
    const [selectedNovel, setSelectedNovel] = useState<Novel | null>(null);
    const [showNovelSelector, setShowNovelSelector] = useState(false);
    const [loadingNovels, setLoadingNovels] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 加载用户的小说列表
    useEffect(() => {
        loadNovels();
    }, []);

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
        try {
            setLoadingNovels(true);
            const response = await novelsApi.queryNovels({
                pos: 0,
                limit: 100,
                orders: [{ name: 'updatedAt', op: 'desc' }]
            });
            setNovels(response.data.items);
        } catch (error: any) {
            console.error('加载小说列表失败:', error);
            toast.error('加载小说列表失败');
        } finally {
            setLoadingNovels(false);
        }
    };

    const handleNovelSelect = (novel: Novel) => {
        setSelectedNovel(novel);
        setShowNovelSelector(false);
        // 清空当前对话，开始新的小说讨论
        setMessages([{
            role: 'assistant',
            content: `您好！我现在可以和您讨论《${novel.title}》这本小说了。我了解这本小说的基本信息：\n\n📖 **小说标题**: ${novel.title}\n📝 **类型**: ${novel.genre || '未设置'}\n📄 **简介**: ${novel.description || '暂无简介'}\n🌍 **世界设定**: ${novel.worldSetting || '暂无设定'}\n\n您可以和我讨论：\n• 情节发展和走向\n• 角色设定和发展\n• 世界观构建\n• 写作建议和灵感\n• 后续章节规划\n\n请告诉我您想讨论什么方面？`,
            timestamp: new Date(),
        }]);
        toast.success(`已选择小说：${novel.title}`);
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: MessageWithTimestamp = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
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
        const contextMessages = selectedNovel ? [
            {
                role: 'system' as const,
                content: `你是一个专业的小说创作助手。当前讨论的小说信息：
标题：${selectedNovel.title}
类型：${selectedNovel.genre || '未设置'}
简介：${selectedNovel.description || '暂无简介'}
世界设定：${selectedNovel.worldSetting || '暂无设定'}

请基于这本小说的背景信息，为用户提供专业的创作建议、情节讨论和写作指导。重点关注情节发展、角色塑造、世界观构建等方面。`
            },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            userMessage
        ] : [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));

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
            () => {
                setIsLoading(false);
                setIsStreaming(false);
            },
            // onError
            (error: string) => {
                console.error('发送消息失败:', error);
                toast.error(error || '发送消息失败，请重试');
                
                // 移除失败的 assistant 消息
                setMessages(prev => prev.slice(0, -1));
                setIsLoading(false);
                setIsStreaming(false);
            },
            0.7,
            2000,
            selectedNovel?.id  // 传递小说 ID
        );
    };

    const handleClear = async () => {
        try {
            await chatApi.clearHistory();
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-5xl mx-auto h-screen flex flex-col">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">小说创作助手</h1>
                                <p className="text-sm text-gray-500">
                                    {selectedNovel ? `正在讨论：《${selectedNovel.title}》` : '选择一本小说开始讨论'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            {/* 小说选择器 */}
                            <div className="relative novel-selector">
                                <button
                                    onClick={() => setShowNovelSelector(!showNovelSelector)}
                                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                                    disabled={loadingNovels}
                                >
                                    <BookOpen className="w-4 h-4" />
                                    <span>{selectedNovel ? selectedNovel.title : '选择小说'}</span>
                                    <ChevronDown className="w-4 h-4" />
                                </button>
                                
                                {showNovelSelector && (
                                    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                                        <div className="p-3 border-b border-gray-100">
                                            <h3 className="font-medium text-gray-900">选择要讨论的小说</h3>
                                        </div>
                                        {loadingNovels ? (
                                            <div className="p-4 text-center">
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" />
                                                <p className="text-sm text-gray-500 mt-2">加载中...</p>
                                            </div>
                                        ) : novels.length === 0 ? (
                                            <div className="p-4 text-center">
                                                <p className="text-sm text-gray-500">暂无小说</p>
                                                <p className="text-xs text-gray-400 mt-1">请先创建一本小说</p>
                                            </div>
                                        ) : (
                                            <div className="max-h-80 overflow-y-auto">
                                                {novels.map((novel) => (
                                                    <button
                                                        key={novel.id}
                                                        onClick={() => handleNovelSelect(novel)}
                                                        className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 ${
                                                            selectedNovel?.id === novel.id ? 'bg-blue-50 border-blue-100' : ''
                                                        }`}
                                                    >
                                                        <div className="font-medium text-gray-900 truncate">{novel.title}</div>
                                                        <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                                                            <span>{novel.genre || '未分类'}</span>
                                                            <span>•</span>
                                                            <span>{new Date(novel.updatedAt).toLocaleDateString()}</span>
                                                        </div>
                                                        {novel.description && (
                                                            <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                                                                {novel.description}
                                                            </div>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={handleClear}
                                className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                disabled={messages.length === 0}
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>清除历史</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                                <Bot className="w-12 h-12 text-white" />
                            </div>
                            {selectedNovel ? (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">开始讨论《{selectedNovel.title}》</h2>
                                    <p className="text-gray-500 max-w-md mb-4">
                                        我是您的小说创作助手，可以帮您讨论情节发展、角色设定、世界观构建等创作问题。
                                    </p>
                                    <div className="bg-blue-50 rounded-lg p-4 max-w-md">
                                        <h3 className="font-medium text-blue-900 mb-2">讨论建议</h3>
                                        <ul className="text-sm text-blue-700 space-y-1">
                                            <li>• 下一章的情节发展</li>
                                            <li>• 角色关系和成长</li>
                                            <li>• 世界观设定完善</li>
                                            <li>• 冲突和转折点</li>
                                        </ul>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">选择小说开始讨论</h2>
                                    <p className="text-gray-500 max-w-md">
                                        请先选择一本小说，然后我们可以深入讨论它的情节发展、角色设定和创作方向。
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex items-start space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                        message.role === 'user'
                                            ? 'bg-blue-500'
                                            : 'bg-gradient-to-br from-purple-500 to-pink-500'
                                    }`}>
                                        {message.role === 'user' ? (
                                            <User className="w-5 h-5 text-white" />
                                        ) : (
                                            <Bot className="w-5 h-5 text-white" />
                                        )}
                                    </div>
                                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                                        <div className={`inline-block px-4 py-3 rounded-2xl ${
                                            message.role === 'user'
                                                ? 'bg-blue-500 text-white'
                                                : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                                        }`}>
                                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                        </div>
                                        {message.timestamp && (
                                            <p className="text-xs text-gray-400 mt-1 px-2">
                                                {message.timestamp.toLocaleTimeString('zh-CN', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isStreaming && (
                        <div className="flex justify-start">
                            <div className="flex items-center space-x-2 text-gray-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">AI 正在思考...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="bg-white border-t border-gray-200 px-6 py-4">
                    <div className="flex items-end space-x-3">
                        <div className="flex-1 relative">
                            <textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={selectedNovel ? `和我讨论《${selectedNovel.title}》的创作... (Shift+Enter 换行)` : "请先选择一本小说开始讨论... (Shift+Enter 换行)"}
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={1}
                                style={{
                                    minHeight: '48px',
                                    maxHeight: '200px',
                                }}
                                disabled={isLoading || !selectedNovel}
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading || !selectedNovel}
                            className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                        {selectedNovel ? 
                            `正在讨论《${selectedNovel.title}》- AI 可能会产生不准确的信息，请谨慎使用` :
                            '请先选择一本小说开始创作讨论'
                        }
                    </p>
                </div>
            </div>
        </div>
    );
}
