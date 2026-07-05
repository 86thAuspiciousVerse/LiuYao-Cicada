// ============================================================
// AI 分析层类型定义
// src/ai/ 可依赖浏览器 API (fetch)，不依赖 React 组件
// ============================================================

import type { LiuQin } from '../core/types';

/** AI 提供商类型 */
export type AIProviderType = 'claude' | 'openai';

/** AI 提供商配置 */
export interface AIProviderConfig {
  type: AIProviderType;
  apiKey: string;
  model?: string;
  baseUrl?: string;  // 自定义 API 端点（如代理）
}

/** AI 分析请求 */
export interface AIAnalysisRequest {
  /** 序列化后的排盘数据（Markdown） */
  serializedPan: string;
  /** 用户占问事项 */
  question?: string;
  /** 使用神 */
  yongShen?: LiuQin;
}

/** AI 分析结果 */
export interface AIAnalysisResult {
  provider: AIProviderType;
  model: string;
  /** AI 返回的完整分析文本 */
  content: string;
  /** 分析使用的 token 数 */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  timestamp: string;
}

/** AI 调用配置 */
export interface AICallConfig {
  maxTokens?: number;
  temperature?: number;
  /** 是否流式输出 */
  stream?: boolean;
  /** 流式回调 */
  onChunk?: (chunk: string) => void;
}

/** AI 分析错误 */
export class AIAnalysisError extends Error {
  provider: AIProviderType;
  statusCode?: number;
  rawError?: unknown;

  constructor(
    message: string,
    provider: AIProviderType,
    statusCode?: number,
    rawError?: unknown,
  ) {
    super(message);
    this.name = 'AIAnalysisError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.rawError = rawError;
  }
}
