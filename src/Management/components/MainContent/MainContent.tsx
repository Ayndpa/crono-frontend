import React, { useState } from 'react';
import { TabList, Tab, Divider, tokens } from '@fluentui/react-components';
import FeedsSetting from './RssFeed/FeedSetting';
import LLMSetting from './LLM/LLMSetting';

export const MainContent: React.FC = () => {
    const [selectedTab, setSelectedTab] = useState("sources");

    return (
        <div>
            <TabList defaultSelectedValue="sources" onTabSelect={(_event, data) => setSelectedTab(data.value as string)}>
                <Tab value="sources">订阅源管理</Tab>
                <Tab value="llm">AI 设置</Tab>
            </TabList>
            <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />
            {selectedTab === "sources" && <FeedsSetting />}
            {selectedTab === "llm" && <LLMSetting />}
        </div>
    );
};
