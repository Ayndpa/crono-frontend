import React from 'react';
import { Button, Dialog, DialogTrigger, DialogSurface, DialogTitle, DialogBody, DialogActions, DialogContent, Input, Field, makeStyles, tokens, Text, InfoLabel } from '@fluentui/react-components';
import { Key24Regular, Link24Regular, CubeRotateRegular } from '@fluentui/react-icons';
import { useEditForm } from './useEditForm';
import type { LLMConfig } from '../../api/llmConfig';

interface LLMFormProps {
  initialData?: Omit<LLMConfig, 'id'> & { id?: string };
  onSubmit: (data: Omit<LLMConfig, 'id'>) => Promise<void>;
  triggerBtnText: string | React.ReactElement;
  triggerBtnAppearance?: 'primary' | 'subtle' | 'secondary' | 'outline' | 'transparent';
  /** 挂载时直接打开对话框（用于外部程序化触发） */
  defaultOpen?: boolean;
  /** 对话框关闭时的回调 */
  onClose?: () => void;
}

const useStyles = makeStyles({
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  iconWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    '& svg': {
      width: '20px',
      height: '20px',
      flexShrink: 0,
    },
  },
  required: {
    color: tokens.colorPaletteRedForeground1,
    marginLeft: tokens.spacingHorizontalXS,
  },
  description: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXS,
  },
  dialogActions: {
    marginTop: tokens.spacingVerticalL,
  },
});

export function EditForm({ initialData, onSubmit, triggerBtnText, triggerBtnAppearance, defaultOpen, onClose }: LLMFormProps) {
  const styles = useStyles();
  const {
    isOpen,
    setIsOpen,
    model,
    setModel,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
    isSubmitting,
    errors,
    handleSubmit,
  } = useEditForm(initialData, onSubmit);

  // 支持挂载时直接打开
  React.useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, []);

  const handleOpenChange = (_e: unknown, data: { open: boolean }) => {
    setIsOpen(data.open);
    if (!data.open) onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger disableButtonEnhancement>
        <Button
          appearance={triggerBtnAppearance ?? (typeof triggerBtnText !== 'string' ? 'subtle' : 'primary')}
          icon={typeof triggerBtnText !== 'string' ? triggerBtnText : undefined}
        >
          {typeof triggerBtnText === 'string' ? triggerBtnText : undefined}
        </Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{initialData ? '编辑 AI 模型配置' : '添加新的 AI 模型配置'}</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <Text size={300}>配置您的 AI 模型连接信息，以便与各种 LLM 服务进行交互。</Text>
            
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className={styles.fieldGroup}>
                <Field
                  label={
                    <div className={styles.iconWrapper}>
                      <CubeRotateRegular />
                      <span>模型名称</span>
                      <span className={styles.required}>*</span>
                      <InfoLabel info="输入您要使用的模型标识符，如 gpt-4o、claude-3 等" />
                    </div>
                  }
                  validationState={errors.model ? 'error' : undefined}
                  validationMessage={errors.model}
                >
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="例如: gpt-4o"
                    disabled={isSubmitting}
                  />
                </Field>
                <Text className={styles.description}>
                  请输入 LLM 服务商提供的模型标识符
                </Text>
              </div>

              <div className={styles.fieldGroup}>
                <Field
                  label={
                    <div className={styles.iconWrapper}>
                      <Link24Regular />
                      <span>Base URL</span>
                      <span className={styles.required}>*</span>
                      <InfoLabel info="API 服务的基础地址，通常以 /v1 结尾" />
                    </div>
                  }
                  validationState={errors.baseUrl ? 'error' : undefined}
                  validationMessage={errors.baseUrl}
                >
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="例如: https://api.openai.com/v1"
                    disabled={isSubmitting}
                  />
                </Field>
                <Text className={styles.description}>
                  不同的服务商有不同的 API 地址
                </Text>
              </div>

              <div className={styles.fieldGroup}>
                <Field
                  label={
                    <div className={styles.iconWrapper}>
                      <Key24Regular />
                      <span>API Key</span>
                      <span className={styles.required}>*</span>
                      <InfoLabel info="用于身份验证的密钥，请妥善保管" />
                    </div>
                  }
                  validationState={errors.apiKey ? 'error' : undefined}
                  validationMessage={errors.apiKey}
                >
                  <Input
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    type="password"
                    disabled={isSubmitting}
                  />
                </Field>
                <Text className={styles.description}>
                  您的 API 密钥将被安全存储
                </Text>
              </div>
            </form>
          </DialogContent>
          <DialogActions className={styles.dialogActions}>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={isSubmitting}>
                取消
              </Button>
            </DialogTrigger>
            <Button 
              appearance="primary" 
              onClick={handleSubmit} 
              disabled={isSubmitting || !model || !baseUrl || !apiKey}
            >
              {isSubmitting ? '保存中...' : '保存配置'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
