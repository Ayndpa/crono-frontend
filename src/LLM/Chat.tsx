import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Text,
    Input,
    Textarea,
    Button,
    Spinner,
    Divider,
    Toolbar,
    ToolbarButton,
    ToolbarGroup,
    Tooltip,
    Card,
    CardHeader,
    Field,
    InfoLabel,
    MessageBar,
    MessageBarTitle,
    MessageBarBody,
    Switch,
    Avatar,
    tokens
} from '@fluentui/react-components';
import {
    Send24Regular,
    Mic24Regular,
    Settings24Regular,
    Lightbulb24Regular,
    Sparkle24Regular,
    ArrowReset24Regular,
    Add24Regular,
    Copy24Regular,
    Edit24Regular,
    Dismiss24Regular,
    Delete24Regular,
    Chat24Regular,
    BotSparkle24Regular,
    Person24Regular
} from '@fluentui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import { apiFetch } from '../api/client';
import { consumeBase64JsonSse } from '../api/stream';
import { ThinkingBlock } from '../components/ThinkingBlock';
import { getConfigs, type LLMConfig } from '../Management/components/MainContent/LLM/api/llmConfig';

// 在这里定义 Message 类型，确保类型安全
interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    thinking?: string;
    timestamp: string;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    updatedAt: string;
}

interface ChatSettings {
    autoTitleEnabled: boolean;
}

interface SpeechRecognitionResultLike {
    isFinal: boolean;
    [index: number]: { transcript: string };
}

interface SpeechRecognitionEventLike {
    resultIndex: number;
    results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((event: SpeechRecognitionEventLike) => void) | null;
    onerror: ((event: { error?: string }) => void) | null;
    onend: (() => void) | null;
}

const renderMessageIcon = (isUser: boolean) => (
    <div
        style={{
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            color: isUser ? tokens.colorNeutralForeground2 : tokens.colorNeutralForeground2,
            flexShrink: 0
        }}
    >
        {isUser ? <Person24Regular /> : <BotSparkle24Regular />}
    </div>
);

const renderConversationIcon = (active = false) => (
    <div
        style={{
            width: '32px',
            height: '32px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            color: active ? tokens.colorNeutralForegroundInverted : tokens.colorNeutralForeground2,
            flexShrink: 0
        }}
    >
        <Chat24Regular />
    </div>
);

const STORAGE_KEY = 'crono-chat-conversations';
const SETTINGS_KEY = 'crono-chat-settings';

const defaultChatSettings: ChatSettings = {
    autoTitleEnabled: true
};

const loadChatSettings = (): ChatSettings => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as Partial<ChatSettings>;
            return {
                autoTitleEnabled: parsed.autoTitleEnabled ?? defaultChatSettings.autoTitleEnabled
            };
        }
    } catch (error) {
        console.error('读取聊天设置失败:', error);
    }
    return defaultChatSettings;
};

const buildAutoTitle = (content: string) => {
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (!normalized) return '新对话';
    return normalized.length > 30 ? `${normalized.slice(0, 30)}...` : normalized;
};

const createWelcomeMessage = (): Message => ({
    id: `welcome-${Date.now()}`,
    role: 'assistant',
    content: '你好！我是您的AI助手。我可以帮助您回答问题、提供信息或协助完成任务。您可以问我任何问题，我会尽力提供有帮助的回应。',
    timestamp: new Date().toISOString()
});

const createConversation = (): Conversation => ({
    id: `conversation-${Date.now()}`,
    title: '新对话',
    messages: [createWelcomeMessage()],
    updatedAt: new Date().toISOString()
});

const ChatApp = () => {
    // 状态管理
    const [conversations, setConversations] = useState<Conversation[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as Conversation[];
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (error) {
            console.error('读取会话历史失败:', error);
        }
        return [createConversation()];
    });
    const [activeConversationId, setActiveConversationId] = useState(() => conversations[0]?.id ?? '');
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [configs, setConfigs] = useState<LLMConfig[]>([]);
    const [configsLoading, setConfigsLoading] = useState(true);
    const [configsError, setConfigsError] = useState<string | null>(null);
    const [currentConfigId, setCurrentConfigId] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [chatSettings, setChatSettings] = useState<ChatSettings>(() => loadChatSettings());
    const [editingConversationId, setEditingConversationId] = useState('');
    const [editingConversationTitle, setEditingConversationTitle] = useState('');

    // 引用
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const recognitionBaseTextRef = useRef('');
    const recognitionFinalTextRef = useRef('');

    const activeConversation = conversations.find(conversation => conversation.id === activeConversationId) ?? conversations[0];
    const messages = activeConversation?.messages ?? [];
    const conversationTitle = activeConversation?.title?.trim() || '新对话';
    const selectedConfig = configs.find(config => config.id.toString() === currentConfigId);
    const model = selectedConfig?.model ?? '';
    const isEditingCurrentConversation = Boolean(activeConversation && editingConversationId === activeConversation.id);

    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 自动滚动
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }, [conversations]);

    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(chatSettings));
    }, [chatSettings]);

    useEffect(() => () => {
        recognitionRef.current?.abort();
        recognitionRef.current = null;
    }, []);

    const loadModelSettings = useCallback(async () => {
        setConfigsLoading(true);
        setConfigsError(null);
        try {
            const [configList, currentResponse] = await Promise.all([
                getConfigs(),
                apiFetch('/config/llm_config_id')
            ]);

            if (!currentResponse.ok) throw new Error('当前模型配置读取失败');
            const currentData = await currentResponse.json();
            const nextConfigId = currentData?.value?.toString() || configList[0]?.id?.toString() || '';

            setConfigs(configList);
            setCurrentConfigId(nextConfigId);
        } catch (error) {
            console.error('加载模型配置失败:', error);
            setConfigsError('模型配置加载失败，请先检查账户设置中的 AI 模型配置。');
        } finally {
            setConfigsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadModelSettings();
    }, [loadModelSettings]);

    useEffect(() => {
        if (showSettings) {
            loadModelSettings();
        }
    }, [loadModelSettings, showSettings]);

    const updateConversation = (conversationId: string, updater: (conversation: Conversation) => Conversation) => {
        setConversations(prev =>
            prev.map(conversation =>
                conversation.id === conversationId ? updater(conversation) : conversation
            )
        );
    };

    const updateActiveMessages = (updater: (messages: Message[]) => Message[]) => {
        updateConversation(activeConversationId, conversation => ({
            ...conversation,
            messages: updater(conversation.messages),
            updatedAt: new Date().toISOString()
        }));
    };

    const cancelTitleEditing = () => {
        setEditingConversationId('');
        setEditingConversationTitle('');
    };

    const startTitleEditing = () => {
        if (!activeConversation) return;
        setEditingConversationId(activeConversation.id);
        setEditingConversationTitle(activeConversation.title);
    };

    const saveTitleEditing = () => {
        if (!editingConversationId) return;

        const nextTitle = editingConversationTitle.trim() || '新对话';
        updateConversation(editingConversationId, conversation => ({
            ...conversation,
            title: nextTitle,
            updatedAt: new Date().toISOString()
        }));
        cancelTitleEditing();
    };

    // 发送消息
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading || !activeConversationId) return;
        if (!model) {
            setConfigsError('请先在账户设置中选择一个 AI 模型配置。');
            return;
        }

        const userMessage = {
            id: Date.now().toString(),
            role: 'user' as 'user',
            content: inputValue,
            timestamp: new Date().toISOString()
        };

        const newMessages = [...messages, userMessage];
        const nextTitle = chatSettings.autoTitleEnabled && (!activeConversation?.title || activeConversation.title === '新对话')
            ? buildAutoTitle(inputValue)
            : activeConversation?.title ?? '新对话';
        updateConversation(activeConversationId, conversation => ({
            ...conversation,
            title: nextTitle,
            messages: newMessages,
            updatedAt: new Date().toISOString()
        }));
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await apiFetch('/llm/stream_chat', {
                method: 'POST',
                body: JSON.stringify({
                    model,
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    stream: true
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'API 请求失败');
            }

            let aiResponseContent = '';
            let aiReasoningContent = '';
            const aiMessageId = (Date.now() + 1).toString();
            const aiMessagePlaceholder = {
                id: aiMessageId,
                role: 'assistant' as 'assistant',
                content: '',
                thinking: '',
                timestamp: new Date().toISOString()
            };

            updateConversation(activeConversationId, conversation => ({
                ...conversation,
                messages: [...conversation.messages, aiMessagePlaceholder],
                updatedAt: new Date().toISOString()
            }));

            if (!response.body) {
                throw new Error('无法读取响应流');
            }

            await consumeBase64JsonSse(response, event => {
                if (event.type === 'reasoning') {
                    aiReasoningContent += event.text;
                } else {
                    aiResponseContent += event.text;
                }

                updateConversation(activeConversationId, conversation => ({
                    ...conversation,
                    messages: conversation.messages.map(msg =>
                        msg.id === aiMessageId
                            ? { ...msg, content: aiResponseContent, thinking: aiReasoningContent }
                            : msg
                    ),
                    updatedAt: new Date().toISOString()
                }));
            });
        } catch (error) {
            console.error("AI消息发送失败:", error);
            const errorMessage = (error instanceof Error) ? error.message : "未知错误";
            updateActiveMessages(prev => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: `抱歉，发送消息时发生错误: ${errorMessage}`,
                    timestamp: new Date().toISOString()
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // 处理键盘事件
    const handleKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void; }) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 开始/停止录音
    const toggleRecording = () => {
        const SpeechRecognition = (window as Window & {
            SpeechRecognition?: new () => SpeechRecognitionLike;
            webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }).SpeechRecognition ?? (window as Window & {
            SpeechRecognition?: new () => SpeechRecognitionLike;
            webkitSpeechRecognition?: new () => SpeechRecognitionLike;
        }).webkitSpeechRecognition;

        if (!isRecording) {
            if (!SpeechRecognition) {
                console.error('当前浏览器不支持语音识别');
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.lang = 'zh-CN';
            recognition.continuous = false;
            recognition.interimResults = true;

            recognitionBaseTextRef.current = inputValue.trimEnd();
            recognitionFinalTextRef.current = '';

            recognition.onresult = (event) => {
                let finalText = recognitionFinalTextRef.current;
                let interimText = '';

                for (let i = event.resultIndex; i < event.results.length; i += 1) {
                    const result = event.results[i];
                    const transcript = result[0]?.transcript ?? '';
                    if (result.isFinal) {
                        finalText += transcript;
                    } else {
                        interimText += transcript;
                    }
                }

                recognitionFinalTextRef.current = finalText;
                const nextText = [recognitionBaseTextRef.current, finalText, interimText].filter(Boolean).join('');
                setInputValue(nextText);
            };

            recognition.onerror = (event) => {
                console.error('语音识别失败:', event.error ?? 'unknown');
                setIsRecording(false);
            };

            recognition.onend = () => {
                setIsRecording(false);
                recognitionRef.current = null;
            };

            recognitionRef.current = recognition;
            setIsRecording(true);

            try {
                recognition.start();
            } catch (error) {
                console.error('启动语音识别失败:', error);
                recognitionRef.current = null;
                setIsRecording(false);
            }
            return;
        }

        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setIsRecording(false);
    };

    const startNewConversation = () => {
        cancelTitleEditing();
        const conversation = createConversation();
        setConversations(prev => [conversation, ...prev]);
        setActiveConversationId(conversation.id);
        setInputValue('');
    };

    const deleteConversation = (conversationId: string) => {
        if (conversationId === editingConversationId) {
            cancelTitleEditing();
        }
        setConversations(prev => {
            const nextConversations = prev.filter(conversation => conversation.id !== conversationId);
            if (nextConversations.length === 0) {
                const conversation = createConversation();
                setActiveConversationId(conversation.id);
                return [conversation];
            }

            if (conversationId === activeConversationId) {
                setActiveConversationId(nextConversations[0].id);
            }

            return nextConversations;
        });
        setInputValue('');
    };

    // 重置对话
    const resetConversation = () => {
        cancelTitleEditing();
        updateConversation(activeConversationId, conversation => ({
            ...conversation,
            title: '新对话',
            messages: [createWelcomeMessage()],
            updatedAt: new Date().toISOString()
        }));
        setInputValue('');
    };

    const handleSelectConfig = async (id: string) => {
        setCurrentConfigId(id);
        try {
            const response = await apiFetch('/config/llm_config_id', {
                method: 'PUT',
                body: JSON.stringify({ key: 'llm_config_id', value: id }),
            });
            if (!response.ok) throw new Error('模型配置同步失败');
            setConfigsError(null);
        } catch (error) {
            console.error('同步模型配置失败:', error);
            setConfigsError('模型配置同步失败，请稍后重试。');
        }
    };

    // 渲染消息
    const renderMessage = (message: Message) => {
        if (message.role === 'assistant' && !message.content.trim() && !message.thinking?.trim()) {
            return null;
        }

        const isUser = message.role === 'user';

        return (
            <div
                key={message.id}
                className={`message-item ${isUser ? 'user-message' : 'ai-message'}`}
                style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '18px'
                }}
            >
                <div style={{ flexShrink: 0, marginTop: '4px' }}>
                    {renderMessageIcon(isUser)}
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: 'min(760px, 78%)',
                        minWidth: '180px'
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: isUser ? '0 6px 6px 0' : '0 0 6px 6px'
                        }}
                    >
                        <Text
                            weight="semibold"
                            size={200}
                            style={{ color: tokens.colorNeutralForeground2 }}
                        >
                                {isUser ? "您" : "AI助手"}
                        </Text>
                        <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </div>

                    <div
                        style={{
                            width: '100%',
                            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            border: isUser ? 'none' : `1px solid ${tokens.colorNeutralStroke2}`,
                            backgroundColor: isUser ? tokens.colorBrandBackground : tokens.colorNeutralBackground1,
                            color: isUser ? tokens.colorNeutralForegroundInverted : tokens.colorNeutralForeground1,
                            boxShadow: isUser ? 'none' : tokens.shadow2,
                            overflow: 'hidden'
                        }}
                    >
                        <div
                            className={`message-markdown ${isUser ? 'message-markdown-user' : ''}`}
                            style={{
                                padding: '12px 16px',
                                lineHeight: 1.6,
                                overflowWrap: 'anywhere'
                            }}
                        >
                            {!isUser && message.thinking?.trim() && (
                                <ThinkingBlock content={message.thinking} label="模型思考" />
                            )}
                            {message.content.trim() && (
                                <ReactMarkdown
                                    children={message.content}
                                    remarkPlugins={[remarkGfm, remarkBreaks]}
                                    rehypePlugins={[rehypeRaw]}
                                />
                            )}
                            {!isUser && !message.content.trim() && message.thinking?.trim() && (
                                <div style={{ marginTop: '8px', color: tokens.colorNeutralForeground3 }}>
                                    <Spinner size="tiny" label="正在生成回答..." />
                                </div>
                            )}
                        </div>

                        <Divider />

                        <Toolbar
                            size="small"
                            style={{
                                minHeight: '32px',
                                padding: '0 6px',
                                justifyContent: isUser ? 'flex-end' : 'flex-start',
                                backgroundColor: isUser ? 'rgba(255,255,255,0.08)' : tokens.colorNeutralBackground2
                            }}
                        >
                            <ToolbarGroup>
                                <Tooltip content="复制" relationship="label">
                                    <ToolbarButton
                                        icon={<Copy24Regular />}
                                        appearance="subtle"
                                        onClick={() => navigator.clipboard?.writeText(message.content)}
                                        style={{ color: isUser ? tokens.colorNeutralForegroundInverted : tokens.colorNeutralForeground2 }}
                                    />
                                </Tooltip>
                                <Tooltip content="重新生成" relationship="label">
                                    <ToolbarButton
                                        icon={<ArrowReset24Regular />}
                                        appearance="subtle"
                                        style={{ color: isUser ? tokens.colorNeutralForegroundInverted : tokens.colorNeutralForeground2 }}
                                    />
                                </Tooltip>
                            </ToolbarGroup>
                        </Toolbar>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="chat-container" style={{
            display: 'flex',
            height: '100%',
            backgroundColor: tokens.colorNeutralBackground3
        }}>
            {/* 左侧对话列表 */}
            <div className="sidebar" style={{
                width: '280px',
                borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '17px', borderBottom: `1px solid ${tokens.colorNeutralStroke1}` }}>
                        <Button
                            appearance="primary"
                            icon={<Add24Regular />}
                            style={{ width: '100%' }}
                            onClick={startNewConversation}
                        >
                            新对话
                        </Button>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px 0'
                }}>
                        {conversations.map((conversation) => (
                            <Card
                                key={conversation.id}
                                appearance="subtle"
                                onClick={() => {
                                    cancelTitleEditing();
                                    setActiveConversationId(conversation.id);
                                }}
                                style={{
                                    margin: '8px 16px',
                                    cursor: 'pointer',
                                    backgroundColor: conversation.id === activeConversationId ? tokens.colorBrandBackground : 'transparent',
                                    color: conversation.id === activeConversationId ? tokens.colorNeutralForegroundInverted : 'inherit'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <CardHeader
                                                            image={renderConversationIcon(conversation.id === activeConversationId)}
                                            header={
                                                <Text
                                                    weight="semibold"
                                                    truncate
                                                    style={{ color: 'inherit' }}
                                                >
                                                    {conversation.title}
                                                </Text>
                                            }
                                            description={
                                                <Text size={200} style={{ color: 'inherit', opacity: 0.8 }}>
                                                    {new Date(conversation.updatedAt).toLocaleString()}
                                                </Text>
                                            }
                                        />
                                    </div>
                                    <Tooltip content="删除对话" relationship="label">
                                        <Button
                                            icon={<Delete24Regular />}
                                            appearance="subtle"
                                            size="small"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                deleteConversation(conversation.id);
                                            }}
                                            style={{
                                                flexShrink: 0,
                                                color: conversation.id === activeConversationId
                                                    ? tokens.colorNeutralForegroundInverted
                                                    : tokens.colorNeutralForeground2
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

            {/* 中间聊天区域 */}
            <div className="main-chat" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* 顶部工具栏 */}
                <div style={{
                    padding: '12px 24px',
                    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {renderConversationIcon()}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {isEditingCurrentConversation ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <Input
                                        value={editingConversationTitle}
                                        onChange={(_, data) => setEditingConversationTitle(data.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                saveTitleEditing();
                                            }
                                            if (event.key === 'Escape') {
                                                event.preventDefault();
                                                cancelTitleEditing();
                                            }
                                        }}
                                        style={{ width: 'min(360px, 100%)' }}
                                    />
                                    <Button appearance="primary" onClick={saveTitleEditing}>
                                        保存
                                    </Button>
                                    <Button appearance="subtle" icon={<Dismiss24Regular />} onClick={cancelTitleEditing} />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <Text weight="semibold" size={400}>
                                        {conversationTitle}
                                    </Text>
                                    <Tooltip content="编辑标题" relationship="label">
                                        <Button
                                            icon={<Edit24Regular />}
                                            appearance="subtle"
                                            onClick={startTitleEditing}
                                        />
                                    </Tooltip>
                                </div>
                            )}
                            <Text size={200} style={{ opacity: 0.7 }}>
                                {model ? `使用 ${model} 模型` : '未选择模型配置'} · 最后更新: {activeConversation ? new Date(activeConversation.updatedAt).toLocaleTimeString() : '--'}
                            </Text>
                        </div>
                        </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Tooltip content="设置" relationship="label">
                            <Button icon={<Settings24Regular />} appearance="subtle" onClick={() => setShowSettings(!showSettings)} />
                        </Tooltip>
                        <Tooltip content="重置对话" relationship="label">
                            <Button icon={<ArrowReset24Regular />} appearance="subtle" onClick={resetConversation} />
                        </Tooltip>
                    </div>
                </div>

                {/* 消息区域 */}
                <div className="messages-area" style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {messages.map(renderMessage)}

                    {isLoading && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            marginBottom: '18px'
                        }}>
                            {renderConversationIcon()}
                            <div
                                style={{
                                    border: `1px solid ${tokens.colorNeutralStroke2}`,
                                    borderRadius: '16px 16px 16px 4px',
                                    backgroundColor: tokens.colorNeutralBackground1,
                                    boxShadow: tokens.shadow2,
                                    padding: '12px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <Spinner size="tiny" />
                                <Text size={300} style={{ color: tokens.colorNeutralForeground2 }}>
                                    AI正在思考中...
                                </Text>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* 输入区域 */}
                <div style={{
                    padding: '0 24px 24px',
                    borderTop: `1px solid ${tokens.colorNeutralStroke1}`
                }}>
                    <MessageBar intent="info" style={{ marginTop: '16px', marginBottom: '16px' }}>
                        <MessageBarBody>
                            <MessageBarTitle>提示</MessageBarTitle>
                            您可以使用 Shift+Enter 换行，Enter 发送消息
                        </MessageBarBody>
                    </MessageBar>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <Field
                                label={
                                    <InfoLabel
                                        info="支持 Markdown 格式，使用 Shift+Enter 换行"
                                        label="输入您的消息"
                                    />
                                }
                            >
                                <Textarea
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    resize="vertical"
                                    rows={3}
                                    placeholder="输入消息..."
                                    style={{ minHeight: '80px' }}
                                />
                            </Field>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <Tooltip content="发送消息" relationship="label">
                                <Button
                                    appearance="primary"
                                    icon={<Send24Regular />}
                                    size="large"
                                    disabled={!inputValue.trim() || isLoading}
                                    onClick={handleSend}
                                />
                            </Tooltip>

                            <Tooltip content={isRecording ? "停止录音" : "语音输入"} relationship="label">
                                <Button
                                    icon={<Mic24Regular />}
                                    appearance={isRecording ? "primary" : "subtle"}
                                    shape="circular"
                                    onClick={toggleRecording}
                                    style={{
                                        backgroundColor: isRecording ? tokens.colorStatusDangerBackground1 : 'transparent',
                                        color: isRecording ? tokens.colorNeutralForegroundInverted : 'inherit'
                                    }}
                                />
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>

            {/* 右侧设置面板 */}
            {showSettings && (
                <div className="settings-panel" style={{
                    width: '320px',
                    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
                    padding: '24px',
                    overflowY: 'auto',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <Text weight="bold" size={500}>
                            对话设置
                        </Text>
                        <Button
                            icon={<Dismiss24Regular />}
                            appearance="subtle"
                            onClick={() => setShowSettings(false)}
                        />
                    </div>

                    <Card>
                        <CardHeader
                            image={<Avatar icon={<Sparkle24Regular />} color="brand" />}
                            header={<Text weight="semibold">标题设置</Text>}
                        />
                        <div style={{ padding: '0 16px 16px' }}>
                            <Switch
                                label="自动生成标题"
                                checked={chatSettings.autoTitleEnabled}
                                onChange={(_, data) => setChatSettings(prev => ({
                                    ...prev,
                                    autoTitleEnabled: data.checked
                                }))}
                            />
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block', marginTop: '8px' }}>
                                基于首条消息自动命名；如果你手动修改标题，它会保留自定义内容。
                            </Text>
                        </div>
                    </Card>

                    <Card style={{ marginTop: '24px' }}>
                        <CardHeader
                            image={<Avatar icon={<Lightbulb24Regular />} />}
                            header={<Text weight="semibold">AI模型设置</Text>}
                        />
                        <div style={{ padding: '0 16px 16px' }}>
                            <Field label="选择模型">
                                <select
                                    value={currentConfigId}
                                    onChange={(e) => handleSelectConfig(e.target.value)}
                                    disabled={configsLoading || configs.length === 0}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        borderRadius: tokens.borderRadiusMedium,
                                        border: `1px solid ${tokens.colorNeutralStroke1}`
                                    }}
                                >
                                    {configs.length === 0 && <option value="">暂无模型配置</option>}
                                    {configs.map(config => (
                                        <option key={config.id} value={config.id.toString()}>
                                            {config.model}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            {configsError && (
                                <MessageBar intent="warning" style={{ marginTop: '16px' }}>
                                    {configsError}
                                </MessageBar>
                            )}
                            </div>
                        </Card>

                    <Card style={{ marginTop: '24px' }}>
                        <CardHeader
                            image={<Avatar icon={<Lightbulb24Regular />} />}
                            header={<Text weight="semibold">提示词工程</Text>}
                        />
                        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Field label="系统提示词">
                                <Textarea
                                    defaultValue="你是一个有帮助、诚实且专业的AI助手。用清晰、简洁的方式回答问题，避免不必要的细节。如果问题不明确，请要求澄清。"
                                    resize="vertical"
                                    rows={5}
                                    style={{ width: '100%', minHeight: '120px' }}
                                />
                            </Field>
                            <Button
                                appearance="primary"
                                icon={<ArrowReset24Regular />}
                                style={{ width: '100%' }}
                            >
                                恢复默认
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default ChatApp;
