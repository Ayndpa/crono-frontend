import { apiFetch } from '../../api/client';
import { consumeBase64JsonSse } from '../../api/stream';

export interface Entity {
  text: string;
  type: 'tech' | 'person' | 'org' | 'concept';
}

export async function fetchEntities(url: string, articleId?: number): Promise<Entity[]> {
  const res = await apiFetch('/llm/entities', {
    method: 'POST',
    body: JSON.stringify({ url, article_id: articleId ?? null }),
  });
  if (!res.ok) throw new Error('实体提取失败');
  const data = await res.json();
  return data.entities as Entity[];
}

export async function streamEntityExplain(params: {
  entity: string;
  entityType: string;
  articleTitle: string;
  articleContext: string;
  historyTitles: string[];
  onChunk: (text: string) => void;
  onReasoning?: (text: string) => void;
  onDone: () => void;
  onError: (e: Error) => void;
}): Promise<void> {
  const res = await apiFetch('/llm/entity_explain/stream', {
    method: 'POST',
    body: JSON.stringify({
      entity: params.entity,
      entity_type: params.entityType,
      article_title: params.articleTitle,
      article_context: params.articleContext,
      history_titles: params.historyTitles,
    }),
  });

  if (!res.ok || !res.body) {
    params.onError(new Error('请求失败'));
    return;
  }

  try {
    await consumeBase64JsonSse(res, event => {
      if (event.type === 'reasoning') {
        params.onReasoning?.(event.text);
        return;
      }

      params.onChunk(event.text);
    });
    params.onDone();
  } catch (e) {
    params.onError(e as Error);
  }
}
