import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Loader2, Bot, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi, chatStream, ChatMessage } from '@/api/chat';

interface MessageWithTimestamp extends ChatMessage {
    timestamp?: Date;
}

export default function Chat() {
    const [messages, setMessages] = useState<MessageWithTimestamp[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

        await chatStream(
            [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.content,
            })),
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
            }
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
                                <h1 className="text-xl font-bold text-gray-900">AI 助手</h1>
                                <p className="text-sm text-gray-500">随时为您提供帮助</p>
                            </div>
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

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                                <Bot className="w-12 h-12 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">开始对话</h2>
                            <p className="text-gray-500 max-w-md">
                                我是您的 AI 助手，可以帮您解答问题、提供建议或进行创意讨论。
                            </p>
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
                                placeholder="输入消息... (Shift+Enter 换行)"
                                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={1}
                                style={{
                                    minHeight: '48px',
                                    maxHeight: '200px',
                                }}
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
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
                        AI 可能会产生不准确的信息，请谨慎使用
                    </p>
                </div>
            </div>
        </div>
    );
}
