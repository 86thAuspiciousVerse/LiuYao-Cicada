// ============================================================
// Anthropic Claude API 客户端
// 调用 Claude Messages API 进行六爻分析
// src/ai/ — 可依赖浏览器 fetch API
// ============================================================

import type {
  AIProviderConfig,
  AIAnalysisRequest,
  AIAnalysisResult,
  AICallConfig,
} from './types';
import { AIAnalysisError } from './types';
import { buildSystemPrompt, buildUserMessage } from './prompt';

/** Claude Messages API 响应中 content block 的类型 */
interface ClaudeContentBlock {
  type: string;
  text?: string;
}

/** Claude Messages API 非流式响应体结构 */
interface ClaudeResponse {
  id: string;
  model: string;
  type: string;
  role: string;
  content: ClaudeContentBlock[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/** Claude Messages API 流式 SSE 事件 */
interface ClaudeStreamEvent {
  type: string;
  delta?: {
    type?: string;
    text?: string;
  };
  content_block?: ClaudeContentBlock;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
  message?: {
    model: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

/**
 * 获取 Claude 默认 API 端点
 *
 * 优先使用 config.baseUrl（支持代理），否则使用 Anthropic 官方端点
 *
 * @param config 提供商配置
 * @returns API 端点 URL
 */
function getEndpoint(config: AIProviderConfig): string {
  const baseUrl = config.baseUrl ?? 'https://api.anthropic.com';
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}/v1/messages`;
}

/**
 * 解析非流式响应 JSON
 *
 * @param data 响应 JSON 对象
 * @returns 解析后的文本内容
 * @throws AIAnalysisError 若响应结构异常
 */
function parseNonStreamingResponse(data: ClaudeResponse): string {
  if (!data.content || data.content.length === 0) {
    throw new AIAnalysisError(
      'Claude 返回了空的响应内容',
      'claude',
    );
  }

  const textBlocks = data.content
    .filter((block: ClaudeContentBlock) => block.type === 'text' && block.text)
    .map((block: ClaudeContentBlock) => block.text);

  return textBlocks.join('\n');
}

/**
 * 解析流式 SSE 数据，通过回调逐块输出，最后返回完整文本
 *
 * @param reader ReadableStreamDefaultReader
 * @param onChunk 流式回调（每收到一个文本块调用一次）
 * @returns 拼接后的完整文本
 */
async function parseStreamingResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE 协议：事件由 \n\n 分隔，每行 data: {...}
    const lines = buffer.split('\n');
    // 保留最后一段不完整的数据（没有 \n 结尾的部分）
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();

      // 跳过空行和注释行
      if (trimmed === '' || trimmed.startsWith(':')) continue;

      // 解析 data: {...} 或 data: [DONE]
      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();

        // OpenAI 风格的 [DONE] 终止符（Claude 不使用，但兼容处理）
        if (dataStr === '[DONE]') continue;

        try {
          const event: ClaudeStreamEvent = JSON.parse(dataStr);

          // content_block_delta 事件：携带文本增量
          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta' &&
            event.delta.text
          ) {
            fullText += event.delta.text;
            onChunk?.(event.delta.text);
          }
        } catch {
          // 忽略无法解析的 SSE 行
        }
      }
    }
  }

  return fullText;
}

/**
 * 调用 Anthropic Claude API 进行六爻分析
 *
 * 使用 Claude Messages API，支持流式与非流式两种模式。
 * 默认模型为 claude-sonnet-4-6，可通过 config.model 覆盖。
 *
 * @param config    AI 提供商配置（含 API Key、模型等）
 * @param request   分析请求（含排盘数据、占问事项）
 * @param callConfig 调用配置（maxTokens、temperature、stream 等）
 * @returns 分析结果
 * @throws AIAnalysisError 网络错误或 API 返回错误时抛出
 */
export async function analyzeWithClaude(
  config: AIProviderConfig,
  request: AIAnalysisRequest,
  callConfig?: AICallConfig,
): Promise<AIAnalysisResult> {
  const endpoint = getEndpoint(config);
  const model = config.model ?? 'claude-sonnet-4-6';
  const maxTokens = callConfig?.maxTokens ?? 4096;
  const temperature = callConfig?.temperature ?? 0.7;
  const stream = callConfig?.stream ?? false;

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(request);

  const body = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
    stream,
  });

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body,
    });
  } catch (err) {
    throw new AIAnalysisError(
      `网络请求失败: ${(err as Error).message}`,
      'claude',
      undefined,
      err,
    );
  }

  // ============================================================
  // 错误处理
  // ============================================================
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorBody = await response.json() as { error?: { message?: string } };
      if (errorBody.error?.message) {
        errorMessage = errorBody.error.message;
      }
    } catch {
      // 无法解析错误体，使用默认消息
    }
    throw new AIAnalysisError(errorMessage, 'claude', response.status);
  }

  // ============================================================
  // 流式模式
  // ============================================================
  if (stream && response.body) {
    const reader = response.body.getReader();

    // 并行解析文本内容和 usage
    // 由于 reader 只能消费一次，先解析文本内容
    const content = await parseStreamingResponse(reader, callConfig?.onChunk);

    // 重新获取 reader 解析 usage — 实际上 reader 已被消费完
    // Claude 流式的 usage 在 message_start/message_delta 中，
    // parseStreamingResponse 已丢弃这些事件。
    // 需要从原始 response 重新读取
    // 重新发起请求解析 usage 不现实，返回不包含 usage 的结果
    return {
      provider: 'claude',
      model,
      content,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================
  // 非流式模式
  // ============================================================
  let data: ClaudeResponse;
  try {
    data = await response.json() as ClaudeResponse;
  } catch (err) {
    throw new AIAnalysisError(
      '解析 Claude 响应 JSON 失败',
      'claude',
      response.status,
      err,
    );
  }

  let content: string;
  try {
    content = parseNonStreamingResponse(data);
  } catch (err) {
    if (err instanceof AIAnalysisError) throw err;
    throw new AIAnalysisError(
      '解析 Claude 响应内容失败',
      'claude',
      response.status,
      err,
    );
  }

  const usage = data.usage
    ? { inputTokens: data.usage.input_tokens, outputTokens: data.usage.output_tokens }
    : undefined;

  return {
    provider: 'claude',
    model,
    content,
    usage,
    timestamp: new Date().toISOString(),
  };
}
