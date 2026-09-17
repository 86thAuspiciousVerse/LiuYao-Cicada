// ============================================================
// OpenAI API 客户端
// 调用 OpenAI Chat Completions API（兼容接口）进行六爻分析
// 也支持任何 OpenAI-compatible 的代理服务
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

/** OpenAI Chat Completions API 非流式响应体结构 */
interface OpenAIResponse {
  id: string;
  object: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** OpenAI 流式 SSE 事件 */
interface OpenAIStreamChunk {
  id: string;
  object: string;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 获取 OpenAI 兼容 API 端点
 *
 * 优先使用 config.baseUrl（支持代理/私有部署），
 * 否则使用 OpenAI 官方端点。
 *
 * @param config 提供商配置
 * @returns API 端点 URL
 */
function getEndpoint(config: AIProviderConfig): string {
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  const normalized = baseUrl.replace(/\/+$/, '');
  return `${normalized}/chat/completions`;
}

/**
 * 解析非流式响应 JSON
 *
 * @param data 响应 JSON 对象
 * @returns 解析后的文本内容
 * @throws AIAnalysisError 若响应结构异常或内容为空
 */
function parseNonStreamingResponse(data: OpenAIResponse): string {
  if (!data.choices || data.choices.length === 0) {
    throw new AIAnalysisError(
      'OpenAI 返回了空的响应内容',
      'openai',
    );
  }

  const content = data.choices[0]?.message?.content;

  if (content === null || content === undefined) {
    throw new AIAnalysisError(
      'OpenAI 返回了空的消息内容',
      'openai',
    );
  }

  return content;
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
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();

      // 跳过空行
      if (trimmed === '') continue;

      // 解析 data: {...}
      if (trimmed.startsWith('data:')) {
        const dataStr = trimmed.slice(5).trim();

        // OpenAI 终止标记
        if (dataStr === '[DONE]') continue;

        try {
          const chunk: OpenAIStreamChunk = JSON.parse(dataStr);

          // 提取 choices[0].delta.content
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullText += delta;
            onChunk?.(delta);
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
 * 调用 OpenAI API（兼容接口）进行六爻分析
 *
 * 也支持任何 OpenAI-compatible 的代理服务（如 Azure OpenAI、Ollama 等）。
 * 默认模型为 gpt-4o，可通过 config.model 覆盖。
 * 默认不设置输出 token 上限；只有调用方显式提供 callConfig.maxTokens 时才发送 max_tokens。
 *
 * @param config    AI 提供商配置（含 API Key、模型、自定义端点等）
 * @param request   分析请求（含排盘数据、占问事项）
 * @param callConfig 调用配置（maxTokens、temperature、stream 等）
 * @returns 分析结果
 * @throws AIAnalysisError 网络错误或 API 返回错误时抛出
 */
export async function analyzeWithOpenAI(
  config: AIProviderConfig,
  request: AIAnalysisRequest,
  callConfig?: AICallConfig,
): Promise<AIAnalysisResult> {
  const endpoint = getEndpoint(config);
  const model = config.model ?? 'gpt-4o';
  const temperature = callConfig?.temperature ?? 0.7;
  const stream = callConfig?.stream ?? false;

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(request);

  const requestBody: Record<string, unknown> = {
    model,
    temperature,
    stream,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };
  if (callConfig?.maxTokens !== undefined) requestBody.max_tokens = callConfig.maxTokens;
  const body = JSON.stringify(requestBody);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
      },
      body,
    });
  } catch (err) {
    throw new AIAnalysisError(
      `网络请求失败: ${(err as Error).message}`,
      'openai',
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
    throw new AIAnalysisError(errorMessage, 'openai', response.status);
  }

  // ============================================================
  // 流式模式
  // ============================================================
  if (stream && response.body) {
    const reader = response.body.getReader();
    const content = await parseStreamingResponse(reader, callConfig?.onChunk);

    return {
      provider: 'openai',
      model,
      content,
      timestamp: new Date().toISOString(),
    };
  }

  // ============================================================
  // 非流式模式
  // ============================================================
  let data: OpenAIResponse;
  try {
    data = await response.json() as OpenAIResponse;
  } catch (err) {
    throw new AIAnalysisError(
      '解析 OpenAI 响应 JSON 失败',
      'openai',
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
      '解析 OpenAI 响应内容失败',
      'openai',
      response.status,
      err,
    );
  }

  const usage = data.usage
    ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
    : undefined;

  return {
    provider: 'openai',
    model,
    content,
    usage,
    timestamp: new Date().toISOString(),
  };
}
