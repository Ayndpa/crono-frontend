import {
    Card,
    Button,
    Divider,
    DataGrid,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridBody,
    DataGridRow,
    DataGridCell,
    Tooltip,
    makeStyles,
    type TableColumnDefinition,
} from '@fluentui/react-components';
import {
    Edit24Regular,
    Add24Filled,
    PenSync24Regular,
} from '@fluentui/react-icons';
import { AddOrUpdateDialog } from './AddOrUpdateDialog';
import { DeleteConfirm } from './DeleteConfirm';
import { useEffect, useState } from 'react';
import axios from 'axios';
import type { Feed } from '../../../../RSS/model/feed';

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
    addContainer: {
        display: 'flex',
        gap: '16px',
        alignItems: 'flex-end',
    },
    field: {
        flexGrow: 1,
    },
    actionsContainer: {
        display: 'flex',
        gap: '8px',
    },
});

// --- 主要组件 ---
const FeedsSetting = () => {
    const styles = useStyles();
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [refreshingFeedId, setRefreshingFeedId] = useState<number | null>(null); // 添加状态
    const [refreshingAll, setRefreshingAll] = useState(false); // 添加状态

    const fetchFeeds = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/rss/feed/`);
            setFeeds(response.data);
        } catch (error) {
            console.error('Failed to fetch feeds:', error);
        }
    };

    useEffect(() => {
        fetchFeeds();
    }, []);

    const handleRefreshFeed = async (feedId: number) => {
        setRefreshingFeedId(feedId); // 设置正在刷新状态
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/rss/updater/refresh/${feedId}`);
        } catch (error) {
            console.error('刷新失败:', error);
        } finally {
            setRefreshingFeedId(null); // 恢复状态
        }
    };

    const handleRefreshAllFeeds = async () => {
        setRefreshingAll(true); // 设置正在刷新状态
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/rss/updater/refresh/all`);
            fetchFeeds(); // 刷新数据
        } catch (error) {
            console.error('刷新全部订阅源失败:', error);
        } finally {
            setRefreshingAll(false); // 恢复状态
        }
    };

    const columns = (
        styles: ReturnType<typeof useStyles>,
        fetchFeeds: () => Promise<void>
    ): TableColumnDefinition<Feed>[] => [
        {
            columnId: 'name',
            renderHeaderCell: () => '名称',
            renderCell: (item) => (
                <Tooltip content={item.name} relationship="label">
                    <span>{item.name}</span>
                </Tooltip>
            ),
            compare: (a, b) => a.name.localeCompare(b.name),
        },
        {
            columnId: 'url',
            renderHeaderCell: () => '订阅源 URL',
            renderCell: (item) => item.url,
            compare: (a, b) => a.url.localeCompare(b.url),
        },
        {
            columnId: 'is_active',
            renderHeaderCell: () => '是否激活',
            renderCell: (item) => (item.is_active ? '是' : '否'),
            compare: (a, b) => Number(b.is_active) - Number(a.is_active),
        },
        {
            columnId: 'actions',
            renderHeaderCell: () => '操作',
            renderCell: (item) => (
                <div className={styles.actionsContainer}>
                    <AddOrUpdateDialog
                        feed={item}
                        trigger={
                            <Tooltip content="编辑" relationship="label">
                                <Button icon={<Edit24Regular />} aria-label="编辑" />
                            </Tooltip>
                        }
                        onSuccess={fetchFeeds}
                    />
                    <DeleteConfirm
                        itemName={item.name}
                        feedId={item.id ?? 0}
                        onSuccess={fetchFeeds}
                    />
                    <Tooltip content={refreshingFeedId === item.id ? '正在刷新...' : '刷新'} relationship="label">
                        <Button
                            icon={<PenSync24Regular />}
                            aria-label="刷新"
                            disabled={refreshingFeedId === item.id} // 禁用按钮
                            onClick={() => handleRefreshFeed(item.id ?? 0)}
                        >
                        </Button>
                    </Tooltip>
                </div>
            ),
            compare: () => 0,
        },
    ];

    return (
        <div className={styles.root}>
            <Card className={styles.card}>
                <div className={styles.addContainer}>
                    <AddOrUpdateDialog
                        trigger={
                            <Button appearance="primary" icon={<Add24Filled />}>
                                添加订阅
                            </Button>
                        }
                        onSuccess={fetchFeeds} // 确保更新后刷新数据
                    />
                    <Tooltip content={refreshingAll ? '正在刷新...' : '刷新全部订阅源'} relationship="label">
                        <Button
                            appearance="secondary"
                            disabled={refreshingAll} // 禁用按钮
                            onClick={handleRefreshAllFeeds}
                        >
                            {refreshingAll ? '刷新中...' : '刷新全部订阅源'}
                        </Button>
                    </Tooltip>
                </div>
                <Divider />

                {/* === 2. 订阅源列表 (Read) === */}
                <DataGrid
                    items={feeds} // 确保绑定最新状态
                    columns={columns(styles, fetchFeeds)}
                    getRowId={(item) => item.id}
                    aria-label="RSS订阅源列表"
                >
                    <DataGridHeader>
                        <DataGridRow>
                            {(column) => (
                                <DataGridHeaderCell key={column.columnId}>
                                    {column.renderHeaderCell()}
                                </DataGridHeaderCell>
                            )}
                        </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<Feed>
                        children={(rowData) => (
                            <DataGridRow key={rowData.item.id}>
                                {(column) => (
                                    <DataGridCell key={column.columnId}>
                                        {column.renderCell(rowData.item)}
                                    </DataGridCell>
                                )}
                            </DataGridRow>
                        )}
                    />
                </DataGrid>
            </Card>
        </div>
    );
};

export default FeedsSetting;