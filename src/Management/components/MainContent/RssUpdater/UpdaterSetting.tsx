import * as React from 'react';
import {
    Card,
    Button,
    Divider,
    Field,
    Input,
    Switch,
    makeStyles,
} from '@fluentui/react-components';
import { useEffect } from 'react';
import { apiFetch } from '../../../../api/client';

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
    const [formState, setFormState] = React.useState(formSettings);
    const [loading, setLoading] = React.useState(false);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/config/');
            const data = await response.json();
            const settingsMap = data.reduce((acc: any, item: { key: string; value: string }) => {
                acc[item.key] = item.value;
                return acc;
            }, {});
            setFormState({
                rssReadInterval: settingsMap.rss_read_interval || '60',
                rssAutoRefresh: settingsMap.rss_auto_refresh === 'true',
            });
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
            await apiFetch('/config', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            alert('设置已保存！');
        } catch (error) {
            console.error('无法保存设置:', error);
            alert('保存失败，请重试。');
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

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
            )}
        </div>
    );
};

export default RSSSetting;
