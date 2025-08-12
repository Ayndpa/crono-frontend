import { useState, useEffect } from 'react';
import type { Feed } from './model/feed';
import type { ArticleResponse } from './model/article';

const fetchArticlesFromBackend = async (): Promise<ArticleResponse[]> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/article/latest?limit=50`);
    if (!res.ok) {
      throw new Error('Failed to fetch articles');
    }
    const data = await res.json();
    return data.articles;
  } catch (err) {
    console.error('后端文章加载失败', err);
    return [];
  }
};

const fetchFeedsFromBackend = async (): Promise<Feed[]> => {
  try {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/feed/`);
    if (!res.ok) {
      throw new Error('Failed to fetch feeds');
    }
    return await res.json();
  } catch (err) {
    console.error('后端订阅源加载失败', err);
    return [];
  }
};

export const useRSSData = () => {
  const [articles, setArticles] = useState<ArticleResponse[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [feeds, setFeeds] = useState<Feed[]>([]);

  useEffect(() => {
    const fetchArticles = async () => {
      const backendArticles = await fetchArticlesFromBackend();
      setArticles(backendArticles);
      if (backendArticles.length > 0) {
        setSelectedArticleId(backendArticles[0]?.id ?? null);
      }
    };
    fetchArticles();
  }, []);

  useEffect(() => {
    const fetchFeeds = async () => {
      const backendFeeds = await fetchFeedsFromBackend();
      setFeeds(backendFeeds);
    };
    fetchFeeds();
  }, []);

  const selectedArticle = articles.find(a => a.id === selectedArticleId) || null;

  const handleArticleSelect = async (id: number) => {
    setSelectedArticleId(id);
    setIsReaderOpen(true);
    setArticles(prevArticles =>
      prevArticles.map(a => (a.id === id ? { ...a, is_read: true } : a))
    );

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/article/state/mark-as-read/${id}`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Failed to mark article as read');
      }
    } catch (err) {
      console.error('标记文章为已读失败', err);
    }
  };

  const refetchArticlesFromBackend = async (): Promise<void> => {
    try {
      const backendArticles = await fetchArticlesFromBackend();
      setArticles(backendArticles);
    } catch (err) {
      console.error('加载所有文章失败', err);
    }
  };

  const fetchArticlesByFeed = async (feedId: string): Promise<void> => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/rss/article/${feedId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch articles by feed');
      }
      const data = await res.json();
      setArticles(data.articles);
    } catch (err) {
      console.error('按订阅源加载文章失败', err);
    }
  };

  return {
    articles,
    selectedArticle,
    isReaderOpen,
    feeds,
    handleArticleSelect,
    setIsReaderOpen,
    fetchArticlesByFeed,
    fetchArticlesFromBackend,
    refetchArticlesFromBackend
  };
};
