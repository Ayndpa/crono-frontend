import React from "react";
import {
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogTitle,
    DialogBody,
    DialogActions,
    DialogContent,
    Button,
    Tooltip,
} from "@fluentui/react-components";
import { Delete24Regular } from "@fluentui/react-icons";

export const DeleteConfirm: React.FC<{
    itemName: string;
    feedId: number;
    onSuccess?: () => void; // 删除成功后的回调
}> = ({ itemName, feedId, onSuccess }) => {
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [open, setOpen] = React.useState(false);

    const handleDelete = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/feed/${feedId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error(`删除失败：${response.status} ${response.statusText}`);
            }

            setOpen(false);
            onSuccess?.(); // 调用回调通知父组件
        } catch (e: any) {
            setError(e?.message ?? "删除失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(_, data) => setOpen(data.open)}
            modalType="alert"
        >
            <DialogTrigger disableButtonEnhancement>
                <Tooltip content="删除" relationship="label">
                    <Button
                        icon={<Delete24Regular />}
                        aria-label="删除"
                        disabled={loading}
                    />
                </Tooltip>
            </DialogTrigger>

            <DialogSurface>
                <DialogBody>
                    <DialogTitle>确认删除</DialogTitle>

                    <DialogContent>
                        {error && (
                            <div style={{ color: "var(--colorPaletteRedForeground1, #d13438)" }}>
                                {error}
                            </div>
                        )}
                        您确定要删除订阅源 “<strong>{itemName}</strong>” 吗？
                        <br />
                        此操作无法撤销。
                    </DialogContent>

                    <DialogActions>
                        <DialogTrigger action="close" disableButtonEnhancement>
                            <Button appearance="secondary" disabled={loading}>
                                取消
                            </Button>
                        </DialogTrigger>
                        <Button appearance="primary" onClick={handleDelete} disabled={loading}>
                            {loading ? "删除中…" : "删除"}
                        </Button>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};