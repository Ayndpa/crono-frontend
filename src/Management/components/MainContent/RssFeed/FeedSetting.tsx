import {
    Card,
    Button,
    DataGrid,
    DataGridHeader,
    DataGridHeaderCell,
    DataGridBody,
    DataGridRow,
    DataGridCell,
    Tooltip,
    makeStyles,
    tokens,
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
import type { Feed } from '../../../../RSS/model/feed';
import { apiFetch } from '../../../../api/client';

// --- 样式 ---
const useStyles = makeStyles({
    root: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    card: {
        padding: '24px',
        borderRadius: '12px',
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        backgroundColor: tokens.colorNeutralBackground1,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
    },
    actionBar: {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px',
    },
    actionsContainer: {
        display: 'flex',
        gap: '8px',
    },
    statusActive: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 8px',
        borderRadius: '10px',
        backgroundColor: 'rgba(16, 124, 65, 0.08)',
        color: '#107c41',
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
    },
    statusInactive: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 8px',
        borderRadius: '10px',
        backgroundColor: 'rgba(168, 0, 0, 0.08)',
        color: '#a80000',
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
    },
    statusDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
    },
    tableHeader: {
        backgroundColor: tokens.colorNeutralBackground2,
    },
    tableHeaderCell: {
        fontWeight: tokens.fontWeightSemibold,
        fontSize: tokens.fontSizeBase300,
    },
    cellText: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    }
});

// --- 主要组件 ---
const FeedsSetting = () => {
    const styles = useStyles();
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [refreshingFeedId, setRefreshingFeedId] = useState<number | null>(null);
    const [refreshingAll, setRefreshingAll] = useState(false);

    const fetchFeeds = async () => {
        try {
            const response = await apiFetch('/rss/feed/');
            setFeeds(await response.json());
        } catch (error) {
            console.error('Failed to fetch feeds:', error);
        }
    };

    useEffect(() => {
        fetchFeeds();
    }, []);

    const handleRefreshFeed = async (feedId: number) => {
        setRefreshingFeedId(feedId);
        try {
            await apiFetch(`/rss/updater/refresh/${feedId}`, { method: 'POST' });
        } catch (error) {
            console.error('刷新失败:', error);
        } finally {
            setRefreshingFeedId(null);
        }
    };

    const handleRefreshAllFeeds = async () => {
        setRefreshingAll(true);
        try {
            await apiFetch('/rss/updater/refresh/all', { method: 'POST' });
            fetchFeeds();
        } catch (error) {
            console.error('刷新全部订阅源失败:', error);
        } finally {
            setRefreshingAll(false);
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
                    <span className={styles.cellText}>{item.name}</span>
                </Tooltip>
            ),
            compare: (a, b) => a.name.localeCompare(b.name),
        },
        {
            columnId: 'url',
            renderHeaderCell: () => '订阅源 URL',
            renderCell: (item) => (
                <Tooltip content={item.url} relationship="label">
                    <span className={styles.cellText}>{item.url}</span>
                </Tooltip>
            ),
            compare: (a, b) => a.url.localeCompare(b.url),
        },
        {
            columnId: 'is_active',
            renderHeaderCell: () => '状态',
            renderCell: (item) => (
                <span className={item.is_active ? styles.statusActive : styles.statusInactive}>
                    <span className={styles.statusDot}></span>
                    {item.is_active ? '活跃' : '失效'}
                </span>
            ),
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
                                <Button size="small" icon={<Edit24Regular />} aria-label="编辑" />
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
                            size="small"
                            icon={<PenSync24Regular />}
                            aria-label="刷新"
                            disabled={refreshingFeedId === item.id}
                            onClick={() => handleRefreshFeed(item.id ?? 0)}
                        />
                    </Tooltip>
                </div>
            ),
            compare: () => 0,
        },
    ];

    return (
        <div className={styles.root}>
            <Card className={styles.card}>
                <div className={styles.actionBar}>
                    <AddOrUpdateDialog
                        trigger={
                            <Button appearance="primary" icon={<Add24Filled />}>
                                添加订阅
                            </Button>
                        }
                        onSuccess={fetchFeeds}
                    />
                    <Tooltip content={refreshingAll ? '正在刷新...' : '刷新全部订阅源'} relationship="label">
                        <Button
                            appearance="secondary"
                            disabled={refreshingAll}
                            onClick={handleRefreshAllFeeds}
                        >
                            {refreshingAll ? '刷新中...' : '刷新全部订阅源'}
                        </Button>
                    </Tooltip>
                </div>

                <DataGrid
                    items={feeds}
                    columns={columns(styles, fetchFeeds)}
                    getRowId={(item) => item.id}
                    aria-label="RSS订阅源列表"
                >
                    <DataGridHeader className={styles.tableHeader}>
                        <DataGridRow>
                            {(column) => (
                                <DataGridHeaderCell key={column.columnId} className={styles.tableHeaderCell}>
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