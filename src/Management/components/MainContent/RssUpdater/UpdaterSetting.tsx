import * as React from 'react';
import {
    Card,
    Button,
    Divider,
    Field,
    Input,
    Checkbox,
    CardFooter,
    Switch,
    makeStyles,
} from '@fluentui/react-components';
import { useEffect } from 'react';

// --- 样式 ---
const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    card: {
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
    },
    formContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
});

const formSettings = {
    rssReadInterval: '60',
    rssAutoRefresh: true,
};

// --- 主要组件 ---
const RSSSetting = () => {
    const styles = useStyles();
    const [selectedTab, setSelectedTab] = React.useState('general');
    const [formState, setFormState] = React.useState(formSettings);
    const [loading, setLoading] = React.useState(false);
    const [updaterStatus, setUpdaterStatus] = React.useState(false);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/config/`);
            const data = await response.json();
            const settingsMap = data.reduce((acc: any, item: { key: string; value: string }) => {
                acc[item.key] = item.value;
                return acc;
            }, {});
            setFormState((prevState) => ({
                rssReadInterval: settingsMap.rss_read_interval || '60',
                rssAutoRefresh: settingsMap.rss_auto_refresh === 'true',
            }));
        } catch (error) {
            console.error('无法加载设置:', error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            const payload = {
                rss_read_interval: formState.rssReadInterval,
                rss_auto_refresh: formState.rssAutoRefresh.toString(),
            };
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            alert('设置已保存！');
        } catch (error) {
            console.error('无法保存设置:', error);
            alert('保存失败，请重试。');
        }
    };

    const fetchUpdaterStatus = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/updater/status`);
            const data = await response.json();
            setUpdaterStatus(data.running);
        } catch (error) {
            console.error('无法获取 RSS 更新程序状态:', error);
        }
    };

    const startUpdater = async () => {
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/updater/start`, { method: 'POST' });
            alert('RSS 更新程序已启动！');
            fetchUpdaterStatus();
        } catch (error) {
            console.error('无法启动 RSS 更新程序:', error);
            alert('启动失败，请重试。');
        }
    };

    const stopUpdater = async () => {
        try {
            await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/updater/stop`, { method: 'POST' });
            alert('RSS 更新程序已停止！');
            fetchUpdaterStatus();
        } catch (error) {
            console.error('无法停止 RSS 更新程序:', error);
            alert('停止失败，请重试。');
        }
    };

    useEffect(() => {
        fetchSettings();
        fetchUpdaterStatus();
    }, []);

    const handleTabSelect = (_event: any, data: { value: React.SetStateAction<string>; }) => {
        setSelectedTab(data.value);
    };

    const handleInputChange = (event: { target: { name: any; value: any; type: any; checked: any; }; }) => {
        const { name, value, type, checked } = event.target;
        setFormState((prevState) => ({
            ...prevState,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleFormSubmit = async (event: { preventDefault: () => void; }) => {
        event.preventDefault();
        await saveSettings();
    };

    return (
        <div className={styles.root}>
            {loading ? (
                <p>加载中...</p>
            ) : (
                <>
                    <Card className={styles.card}>
                        <Button type="submit" appearance="primary" onClick={handleFormSubmit}>
                            保存设置
                        </Button>

                        <Divider />

                        <form onSubmit={handleFormSubmit} className={styles.formContainer}>
                            <Field label="RSS读取间隔 (分钟)">
                                <Input
                                    type="number"
                                    name="rssReadInterval"
                                    value={formState.rssReadInterval}
                                    onChange={handleInputChange}
                                    min="1"
                                    required
                                />
                            </Field>

                            <Switch
                                name="rssAutoRefresh"
                                label={"自动刷新RSS"}
                                checked={formState.rssAutoRefresh}
                                onChange={(_: any, data: { checked: any; }) =>
                                    handleInputChange({
                                        target: {
                                            name: 'rssAutoRefresh',
                                            type: 'checkbox',
                                            checked: data.checked,
                                            value: '',
                                        },
                                    })
                                }
                            />
                        </form>
                    </Card>

                    <Card className={styles.card}>
                        <h3>RSS 更新程序状态</h3>
                        <p>当前状态: {updaterStatus ? '运行中' : '已停止'}</p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button
                                appearance="primary"
                                onClick={startUpdater}
                                disabled={updaterStatus}
                            >
                                启动
                            </Button>
                            <Button
                                appearance="secondary"
                                onClick={stopUpdater}
                                disabled={!updaterStatus}
                            >
                                停止
                            </Button>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default RSSSetting;