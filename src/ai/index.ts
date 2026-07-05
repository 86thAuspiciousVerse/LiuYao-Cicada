// ============================================================
// 六爻 AI 分析 — 统一对外接口
// 自动选择提供商，导出所有公共类型和函数
// src/ai/ — 可依赖浏览器 fetch API
// ============================================================

/**
 * 六爻 AI 分析 — 统一接口
 *
 * 使用示例:
 * ```typescript
 * import { analyzeHexagram } from '@/ai';
 *
 * const result = await analyzeHexagram(
 *   { type: 'claude', apiKey: 'sk-ant-...' },
 *   { serializedPan: markdown, question: '问财运' }
 * );
 * console.log(result.content);
 * ```
 */

export { analyzeWithClaude } from './claude';
export { analyzeWithOpenAI } from './openai';
export { buildSystemPrompt, buildUserMessage } from './prompt';
export { AIAnalysisError } from './types';
export type {
  AIProviderType,
  AIProviderConfig,
  AIAnalysisRequest,
  AIAnalysisResult,
  AICallConfig,
} from './types';

import { analyzeWithClaude } from './claude';
import { analyzeWithOpenAI } from './openai';
import type { AIProviderConfig, AIAnalysisRequest, AIAnalysisResult, AICallConfig } from './types';

/**
 * 根据提供商类型自动选择 API 进行分析
 *
 * 支持 'claude' 和 'openai' 两种提供商。
 * 使用动态 import 按需加载对应模块，避免加载不需要的提供商代码。
 *
 * @param config    AI 提供商配置（type / apiKey / model 等）
 * @param request   分析请求（含排盘数据、占问事项）
 * @param callConfig 调用配置（maxTokens、temperature、stream 等）
 * @returns 分析结果
 * @throws AIAnalysisError API 调用失败时抛出
 * @throws Error 不支持的提供商类型时抛出
 */
export async function analyzeHexagram(
  config: AIProviderConfig,
  request: AIAnalysisRequest,
  callConfig?: AICallConfig,
): Promise<AIAnalysisResult> {
  switch (config.type) {
    case 'claude': {
      return analyzeWithClaude(config, request, callConfig);
    }
    case 'openai': {
      return analyzeWithOpenAI(config, request, callConfig);
    }
    default: {
      const unsupported = config as { type?: unknown };
      throw new Error(`不支持的 AI 提供商: ${String(unsupported.type)}`);
    }
  }
}
