import * as React from "react";
import {
    Dialog,
    DialogTrigger,
    DialogSurface,
    DialogBody,
    DialogTitle,
    DialogContent,
    DialogActions,
    Field,
    Input,
    Button,
    Tooltip,
} from "@fluentui/react-components";
import { Link24Regular } from "@fluentui/react-icons";
import { makeStyles } from "@fluentui/react-components";
import type { Feed } from "../../../../RSS/model/feed";

function isValidHttpUrl(u: string): boolean {
    try {
        const parsed = new URL(u);
        return (
            (parsed.protocol === "http:" || parsed.protocol === "https:") &&
            !!parsed.hostname
        );
    } catch {
        return false;
    }
}

const useStyles = makeStyles({
    root: {
    },
    formContainer: {
        display: "grid",
        gap: "12px",
    },
    errorText: {
        color: "#d13438",
    },
});

export const AddOrUpdateDialog: React.FC<{
    feed?: Feed; // 用于编辑时传入的初始数据
    trigger: React.ReactElement; // 外部传入的触发器
    onSuccess?: () => void; // 保存成功后的回调
}> = ({ feed, trigger, onSuccess }) => {
    const styles = useStyles();
    const [open, setOpen] = React.useState(false);

    const [name, setName] = React.useState(feed?.name || "");
    const [url, setUrl] = React.useState(feed?.url || "");

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const reset = () => {
        setName(feed?.name || "");
        setUrl(feed?.url || "");
        setLoading(false);
        setError(null);
    };

    const validName = name.trim().length > 0;
    const validUrl = isValidHttpUrl(url.trim());
    const formValid = validName && validUrl;

    const submit = async () => {
        if (!formValid || loading) return;
        try {
            setLoading(true);
            setError(null);

            const payload: Omit<Feed, "id"> = {
                name: name.trim(),
                url: url.trim(),
            };

            const response = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/rss/feed${feed ? `/${feed.id}` : ""}`,
                {
                    method: feed ? "PUT" : "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `请求失败：${response.status} ${response.statusText}`
                );
            }

            setOpen(false);
            reset();
            onSuccess?.(); // 调用回调通知父组件
        } catch (e: any) {
            setError(e?.message ?? "提交失败，请重试");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(_, data) => {
                setOpen(data.open);
                if (!data.open) reset();
            }}
        >
            <DialogTrigger>
                {trigger}
            </DialogTrigger>

            <DialogSurface>
                <DialogBody>
                    <DialogTitle>{feed ? "编辑订阅源" : "添加新订阅源"}</DialogTitle>

                    <DialogContent>
                        <div className={styles.formContainer}>
                            {error && <div className={styles.errorText}>{error}</div>}

                            <Field
                                label="名称"
                                required
                                validationState={!name ? undefined : validName ? "success" : "error"}
                                validationMessage={
                                    !name ? undefined : validName ? undefined : "请输入名称"
                                }
                            >
                                <Input
                                    value={name}
                                    onChange={(_, data) => setName(data.value)}
                                    placeholder="例如：少数派 / 阮一峰网络日志"
                                />
                            </Field>

                            <Field
                                label="订阅源 URL"
                                required
                                hint="必须是以 http:// 或 https:// 开头的完整地址"
                                validationState={!url ? undefined : validUrl ? "success" : "error"}
                                validationMessage={
                                    !url ? undefined : validUrl ? undefined : "请输入有效的 http(s) URL"
                                }
                            >
                                <Input
                                    value={url}
                                    onChange={(_, data) => setUrl(data.value)}
                                    type="url"
                                    inputMode="url"
                                    placeholder="https://example.com/feed.xml"
                                    contentBefore={<Link24Regular />}
                                />
                            </Field>
                        </div>
                    </DialogContent>

                    <DialogActions>
                        <DialogTrigger>
                            <Button appearance="secondary" disabled={loading}>
                                取消
                            </Button>
                        </DialogTrigger>

                        <Tooltip content={formValid ? "保存并关闭" : "请填写必填项"} relationship="label">
                            <Button appearance="primary" onClick={submit} disabled={!formValid || loading}>
                                {loading ? "保存中…" : "保存"}
                            </Button>
                        </Tooltip>
                    </DialogActions>
                </DialogBody>
            </DialogSurface>
        </Dialog>
    );
};