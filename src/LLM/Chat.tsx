import React, { useState, useEffect, useRef } from 'react';
import {
    FluentProvider,
    webLightTheme,
    Avatar,
    Text,
    Textarea,
    Button,
    Spinner,
    Divider,
    Toolbar,
    ToolbarButton,
    ToolbarGroup,
    Tooltip,
    Menu,
    MenuItem,
    MenuList,
    MenuPopover,
    MenuTrigger,
    Card,
    CardHeader,
    CardPreview,
    Checkbox,
    Switch,
    Slider,
    Label,
    Field,
    InfoLabel,
    Badge,
    MessageBar,
    MessageBarTitle,
    MessageBarBody,
    ProgressBar,
    useId,
    tokens
} from '@fluentui/react-components';
import {
    Send24Regular,
    Mic24Regular,
    Attach16Regular,
    MoreHorizontal24Regular,
    Settings24Regular,
    Lightbulb24Regular,
    Sparkle24Regular,
    History24Regular,
    Person24Regular,
    ArrowReset24Regular,
    Add24Regular,
    Dismiss24Regular,
    Star24Regular,
    ShieldLock24Regular
} from '@fluentui/react-icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// 引入 remark-breaks 插件来处理硬换行
import remarkBreaks from 'remark-breaks';

// 在这里定义 Message 类型，确保类型安全
interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
}

const ChatApp = () => {
    // 状态管理
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [temperature, setTemperature] = useState(0.7);
    const [model, setModel] = useState('qwen-plus-latest'); // 默认模型
    const [isRecording, setIsRecording] = useState(false);
    const [conversationTitle, setConversationTitle] = useState('新对话');

    // 引用
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // 滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 自动滚动
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 模拟初始欢迎消息
    useEffect(() => {
        setTimeout(() => {
            setMessages(prev => [
                ...prev,
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: '你好！我是您的AI助手。我可以帮助您回答问题、提供信息或协助完成任务。您可以问我任何问题，我会尽力提供有帮助的回应。',
                    timestamp: new Date().toISOString()
                }
            ]);
        }, 500);
    }, []);

    // 发送消息
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user' as 'user',
            content: inputValue,
            timestamp: new Date().toISOString()
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/llm/stream_chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    temperature: temperature,
                    stream: true
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'API 请求失败');
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('无法读取响应流');
            }

            const decoder = new TextDecoder('utf-8');
            let aiResponseContent = '';
            let buffer = '';
            const aiMessageId = (Date.now() + 1).toString();
            const aiMessagePlaceholder = {
                id: aiMessageId,
                role: 'assistant' as 'assistant',
                content: '',
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMessagePlaceholder]);

            while (true) {
                const { value, done } = await reader.read();
                if (done) {
                    if (buffer.length > 0) {
                        // 正确地处理 Base64 解码和 UTF-8 解码
                        const binaryString = atob(buffer);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        aiResponseContent += new TextDecoder('utf-8').decode(bytes);
                    }
                    break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                lines.forEach(line => {
                    if (line.startsWith('data:')) {
                        const encodedContent = line.substring(line.indexOf(':') + 1).trim();
                        if (encodedContent && encodedContent !== '[DONE]') {
                            try {
                                // 关键改动: Base64 解码 + UTF-8 解码
                                const binaryString = atob(encodedContent);
                                const bytes = new Uint8Array(binaryString.length);
                                for (let i = 0; i < binaryString.length; i++) {
                                    bytes[i] = binaryString.charCodeAt(i);
                                }
                                aiResponseContent += new TextDecoder('utf-8').decode(bytes);
                            } catch (e) {
                                console.error('Base64 解码失败:', e, '原始数据:', encodedContent);
                            }
                        }
                    }
                });

                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === aiMessageId
                            ? { ...msg, content: aiResponseContent }
                            : msg
                    )
                );
            }

            if (messages.length === 1) {
                setConversationTitle(inputValue.substring(0, 30) + (inputValue.length > 30 ? '...' : ''));
            }
        } catch (error) {
            console.error("AI消息发送失败:", error);
            const errorMessage = (error instanceof Error) ? error.message : "未知错误";
            setMessages(prev => [
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
    const handleKeyDown = (e: { key: string; shiftKey: any; preventDefault: () => void; }) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // 开始/停止录音
    const toggleRecording = () => {
        setIsRecording(!isRecording);
        // 实际应用中这里会集成语音识别API
    };

    // 重置对话
    const resetConversation = () => {
        setMessages([]);
        setConversationTitle('新对话');
        setInputValue('');

        // 添加新的欢迎消息
        setTimeout(() => {
            setMessages(prev => [
                ...prev,
                {
                    id: 'welcome',
                    role: 'assistant',
                    content: '你好！我是您的AI助手。我可以帮助您回答问题、提供信息或协助完成任务。您可以问我任何问题，我会尽力提供有帮助的回应。',
                    timestamp: new Date().toISOString()
                }
            ]);
        }, 300);
    };

    // 渲染消息
    const renderMessage = (message: Message) => {
        const isUser = message.role === 'user';
        const avatar = isUser
            ? <Avatar name="您" badge={{ status: 'available' }} />
            : <Avatar name="AI助手" badge={{ status: 'available' }} color="brand" />;

        return (
            <div
                key={message.id}
                className={`message-item ${isUser ? 'user-message' : 'ai-message'}`}
                style={{
                    display: 'flex',
                    flexDirection: isUser ? 'row-reverse' : 'row',
                    marginBottom: '16px'
                }}
            >
                <div style={{ flexShrink: 0, margin: isUser ? '0 0 0 16px' : '0 16px 0 0' }}>
                    {avatar}
                </div>

                <Card
                    appearance="subtle"
                    style={{
                        maxWidth: '80%',
                        backgroundColor: isUser ? tokens.colorBrandBackground : tokens.colorNeutralBackground1,
                        color: isUser ? tokens.colorNeutralForegroundInverted : tokens.colorNeutralForeground1,
                        boxShadow: tokens.shadow4
                    }}
                >
                    <CardHeader
                        header={
                            <Text weight={isUser ? "semibold" : "bold"}>
                                {isUser ? "您" : "AI助手"}
                            </Text>
                        }
                        description={
                            <Text size={200} style={{ opacity: 0.7 }}>
                                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        }
                    />

                    {/* 关键改动在这里：使用 ReactMarkdown 并添加 remarkBreaks 插件 */}
                    <div style={{ padding: '0 16px 16px' }}>
                        <ReactMarkdown
                            children={message.content}
                            remarkPlugins={[remarkGfm, remarkBreaks]} // <-- 添加 remarkBreaks
                        />
                    </div>

                    <Divider style={{ margin: '12px 0' }} />

                    <Toolbar size="small">
                        <ToolbarGroup>
                            <Tooltip content="点赞" relationship="label">
                                <ToolbarButton icon={<Star24Regular />} appearance="subtle" />
                            </Tooltip>
                            <Tooltip content="复制" relationship="label">
                                <ToolbarButton icon={<Add24Regular />} appearance="subtle" />
                            </Tooltip>
                            <Tooltip content="重新生成" relationship="label">
                                <ToolbarButton icon={<ArrowReset24Regular />} appearance="subtle" />
                            </Tooltip>
                            <Menu>
                                <MenuTrigger>
                                    <Tooltip content="更多操作" relationship="label">
                                        <ToolbarButton icon={<MoreHorizontal24Regular />} appearance="subtle" />
                                    </Tooltip>
                                </MenuTrigger>
                                <MenuPopover>
                                    <MenuList>
                                        <MenuItem icon={<Add24Regular />}>添加到收藏</MenuItem>
                                        <MenuItem icon={<Dismiss24Regular />}>隐藏消息</MenuItem>
                                        <Divider />
                                        <MenuItem icon={<ShieldLock24Regular />}>举报问题</MenuItem>
                                    </MenuList>
                                </MenuPopover>
                            </Menu>
                        </ToolbarGroup>
                    </Toolbar>
                </Card>
            </div>
        );
    };

    return (
        <FluentProvider theme={webLightTheme}>
            <div className="chat-container" style={{
                display: 'flex',
                height: '100vh',
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
                    <div style={{ padding: '16px', borderBottom: `1px solid ${tokens.colorNeutralStroke1}` }}>
                        <Button
                            appearance="primary"
                            icon={<Add24Regular />}
                            style={{ width: '100%' }}
                        >
                            新对话
                        </Button>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '8px 0'
                    }}>
                        {[...Array(8)].map((_, i) => (
                            <Card
                                key={i}
                                appearance="subtle"
                                style={{
                                    margin: '8px 16px',
                                    cursor: 'pointer',
                                    backgroundColor: i === 0 ? tokens.colorBrandBackground : 'transparent',
                                    color: i === 0 ? tokens.colorNeutralForegroundInverted : 'inherit'
                                }}
                            >
                                <CardHeader
                                    image={<Avatar name="项目讨论" />}
                                    header={<Text weight="semibold">项目进度讨论</Text>}
                                    description={<Text size={200}>2023-10-15</Text>}
                                />
                            </Card>
                        ))}
                    </div>

                    <div style={{
                        padding: '16px',
                        borderTop: `1px solid ${tokens.colorNeutralStroke1}`
                    }}>
                        <Menu>
                            <MenuTrigger>
                                <Button
                                    appearance="subtle"
                                    icon={<Person24Regular />}
                                    style={{ width: '100%', justifyContent: 'flex-start' }}
                                >
                                    账户设置
                                </Button>
                            </MenuTrigger>
                            <MenuPopover>
                                <MenuList>
                                    <MenuItem>个人资料</MenuItem>
                                    <MenuItem>订阅计划</MenuItem>
                                    <Divider />
                                    <MenuItem>退出登录</MenuItem>
                                </MenuList>
                            </MenuPopover>
                        </Menu>
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
                            <Avatar name="AI助手" color="brand" />
                            <div>
                                <Text weight="semibold" size={400}>
                                    {conversationTitle}
                                </Text>
                                <Text size={200} style={{ opacity: 0.7 }}>
                                    使用 {model} 模型 · 最后更新: {new Date().toLocaleTimeString()}
                                </Text>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Tooltip content="历史记录" relationship="label">
                                <Button icon={<History24Regular />} appearance="subtle" />
                            </Tooltip>
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
                                alignItems: 'center',
                                margin: '0 0 0 16px',
                                marginBottom: '16px'
                            }}>
                                <Avatar name="AI助手" color="brand" />
                                <Card
                                    appearance="subtle"
                                    style={{
                                        marginLeft: '16px',
                                        backgroundColor: tokens.colorNeutralBackground1,
                                        maxWidth: '80%'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '8px', padding: '8px 0' }}>
                                        <Spinner size="small" />
                                        <Text>AI正在思考中...</Text>
                                    </div>
                                </Card>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* 输入区域 */}
                    <div style={{
                        padding: '0 24px 24px',
                        borderTop: `1px solid ${tokens.colorNeutralStroke1}`
                    }}>
                        <MessageBar intent="info" style={{ marginBottom: '16px' }}>
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
                                header={<Text weight="semibold">AI模型设置</Text>}
                            />
                            <div style={{ padding: '0 16px 16px' }}>
                                <Field label="选择模型">
                                    <select
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: tokens.borderRadiusMedium,
                                            border: `1px solid ${tokens.colorNeutralStroke1}`
                                        }}
                                    >
                                        <option value="gpt-4">GPT-4 (推荐)</option>
                                        <option value="gpt-3.5">GPT-3.5 Turbo</option>
                                        <option value="claude">Claude 2</option>
                                    </select>
                                </Field>

                                <Field
                                    label={
                                        <InfoLabel
                                            info="控制AI的创造力。值越高，回答越有创意但可能不准确"
                                            label="随机性 (Temperature)"
                                        />
                                    }
                                    style={{ marginTop: '20px' }}
                                >
                                    <Slider
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        value={temperature}
                                        onChange={(_, data) => setTemperature(data.value)}
                                    />
                                    <Text size={200} style={{ textAlign: 'center', marginTop: '4px' }}>
                                        {temperature.toFixed(1)} - {temperature < 0.3 ? '精确' : temperature < 0.7 ? '平衡' : '创意'}
                                    </Text>
                                </Field>

                                <div style={{ marginTop: '20px' }}>
                                    <Checkbox label="启用联网搜索" />
                                    <Checkbox label="显示思考过程" defaultChecked />
                                    <Checkbox label="保存对话历史" defaultChecked />
                                </div>
                            </div>
                        </Card>

                        <Card style={{ marginTop: '24px' }}>
                            <CardHeader
                                image={<Avatar icon={<Lightbulb24Regular />} />}
                                header={<Text weight="semibold">提示词工程</Text>}
                            />
                            <div style={{ padding: '0 16px 16px' }}>
                                <Label>系统提示词</Label>
                                <Textarea
                                    defaultValue="你是一个有帮助、诚实且专业的AI助手。用清晰、简洁的方式回答问题，避免不必要的细节。如果问题不明确，请要求澄清。"
                                    resize="vertical"
                                    rows={4}
                                    style={{ marginTop: '8px' }}
                                />
                                <Button
                                    appearance="primary"
                                    icon={<ArrowReset24Regular />}
                                    style={{ marginTop: '12px', width: '100%' }}
                                >
                                    恢复默认
                                </Button>
                            </div>
                        </Card>

                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <Text size={200} style={{ opacity: 0.7 }}>
                                AI助手 v1.2.0 • 由 Azure AI 提供支持
                            </Text>
                        </div>
                    </div>
                )}
            </div>

            {/* 全局样式 */}
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .chat-container {
                    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
                }

                .messages-area {
                    scroll-behavior: smooth;
                }

                .message-item {
                    animation: fadeIn 0.3s ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @media (max-width: 1200px) {
                    .sidebar {
                        display: none;
                    }
                }

                @media (max-width: 768px) {
                    .chat-container {
                        flex-direction: column;
                    }

                    .sidebar {
                        width: 100%;
                        border-right: none;
                        border-bottom: 1px solid ${tokens.colorNeutralStroke1};
                    }

                    .settings-panel {
                        width: 100%;
                        border-left: none;
                        border-top: 1px solid ${tokens.colorNeutralStroke1};
                    }
                }
            `}</style>
        </FluentProvider>
    );
};

export default ChatApp;