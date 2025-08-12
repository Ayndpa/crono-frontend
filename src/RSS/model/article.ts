export interface ArticleResponse {
    /**
     * 数据库内部的唯一标识符，自增
     */
    id?: number;

    /**
     * 指向该文章所属 RSS Feed 的外键
     */
    feed_id: number;

    /**
     * 文章标题，例如 朝圣者 (Pilgrims)
     */
    title: string;

    /**
     * 文章的永久链接，用于访问原文
     */
    link: string;

    /**
     * 唯一标识符，用于判断文章是否已经存在，非常重要
     */
    guid: string;

    /**
     * 文章发布时间，用于排序和显示
     */
    pub_date: string;

    /**
     * 文章作者，例如 Amanita Design s.r.o.
     */
    author?: string;

    /**
     * 用户是否已读该文章
     */
    is_read: boolean;

    /**
     * 对文章的分类或标签
     */
    tags?: string[];

    /**
     * AI生成的文章总结内容
     */
    ai_summary?: string;

    /**
     * 状态最后更新时间
     */
    updated_at: string;
}