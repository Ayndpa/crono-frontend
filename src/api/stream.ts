export type StreamEventType = 'reasoning' | 'content';

export interface StreamEvent {
  type: StreamEventType;
  text: string;
}

function decodeStreamEvent(encoded: string): StreamEvent {
  let decoded = '';
  try {
    const binString = atob(encoded);
    const bytes = Uint8Array.from(binString, (m) => m.codePointAt(0)!);
    decoded = new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    console.error('Base64 or UTF-8 decoding failed, falling back:', e);
    try {
      decoded = atob(encoded);
    } catch {
      decoded = encoded;
    }
  }

  try {
    const parsed = JSON.parse(decoded) as Partial<StreamEvent>;
    if (parsed && typeof parsed.text === 'string') {
      return {
        type: parsed.type === 'reasoning' ? 'reasoning' : 'content',
        text: parsed.text,
      };
    }
  } catch {
    // 兼容旧协议：只有纯文本时默认当作 content
  }

  return {
    type: 'content',
    text: decoded,
  };
}

export async function consumeBase64JsonSse(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;

      const encoded = trimmed.substring(trimmed.indexOf(':') + 1).trim();
      if (!encoded || encoded === '[DONE]') continue;

      onEvent(decodeStreamEvent(encoded));
    }
  }

  const trailing = buffer.trim();
  if (trailing.startsWith('data:')) {
    const encoded = trailing.substring(trailing.indexOf(':') + 1).trim();
    if (encoded && encoded !== '[DONE]') {
      onEvent(decodeStreamEvent(encoded));
    }
  }
}