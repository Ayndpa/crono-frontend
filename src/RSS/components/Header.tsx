import {
  Text,
  Toolbar,
  ToolbarGroup,
  ToolbarButton,
  ToolbarDivider,
  SearchBox,
  Tooltip,
  makeStyles, // 导入 makeStyles
  shorthands, // 导入 shorthands 用于简化样式
} from '@fluentui/react-components';
import { ArrowClockwise24Regular, WeatherMoon24Regular } from '@fluentui/react-icons';
import ManagementDialog from '../../Management/ManagementDialog';

// 定义样式
const useStyles = makeStyles({
  // 根样式，应用于 Toolbar
  root: {
    display: 'flex', // 使用 flex 布局
    justifyContent: 'space-between', // 将内容分散在两端
    alignItems: 'center', // 垂直居中对齐
    ...shorthands.padding('12px', '20px'), // 添加内边距
    ...shorthands.borderBottom('1px', 'solid', '#eee'), // 添加底部边框
    width: '100%', // 确保宽度占满
    boxSizing: 'border-box', // 确保内边距和边框包含在宽度内
    height: '5vh'
  },
  // 搜索框的容器样式，使其可以居中或有固定宽度
  searchGroup: {
    flexGrow: 1, // 让搜索组占据可用空间
    display: 'flex',
    justifyContent: 'center', // 居中搜索框
    ...shorthands.margin('0', '20px'), // 左右外边距
  },
  // 确保搜索框本身有合适的宽度
  searchBox: {
    minWidth: '60%',
  },
  // 工具栏按钮组的样式，确保间距
  buttonGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px', // 按钮之间的间距
  },
  dialogSurface: {
    height: '88vh',
    width: '92vw',
    maxWidth: 'none', // 确保对话框宽度不受限制
  }
});

export const Header = ({ isDark, toggleTheme }: { isDark: boolean; toggleTheme: () => void }) => {
  const styles = useStyles();

  return (
    <>
      <Toolbar className={styles.root}>
        <ToolbarGroup>
          <Text size={600} weight="semibold">RSS阅读器</Text>
        </ToolbarGroup>

        <ToolbarGroup className={styles.searchGroup}>
          <SearchBox
            placeholder="搜索文章..."
            appearance="underline"
            className={styles.searchBox}
          />
        </ToolbarGroup>

        <ToolbarGroup className={styles.buttonGroup}>
          <Tooltip content="切换主题" relationship="label">
            <ToolbarButton
              aria-label="切换主题"
              icon={<WeatherMoon24Regular />}
              onClick={toggleTheme}
            />
          </Tooltip>
          <ManagementDialog />
        </ToolbarGroup>
      </Toolbar>
    </>
  );
};

export default Header;