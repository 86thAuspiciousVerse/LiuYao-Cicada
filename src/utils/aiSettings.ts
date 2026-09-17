import type { AIProviderType } from '../ai';

const AI_PROVIDER_KEY = 'liuyao.ai.provider';
const AI_PROVIDER_NAME_KEY = 'liuyao.ai.providerName';
const AI_MODEL_KEY = 'liuyao.ai.model';
const AI_API_KEY = 'liuyao.ai.apiKey';
const AI_BASE_URL_KEY = 'liuyao.ai.baseUrl';

export interface AISettings {
  provider: AIProviderType;
  providerName: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

export function readAISettings(): AISettings {
  const provider = readProvider();

  return {
    provider,
    providerName: readStored(AI_PROVIDER_NAME_KEY, provider === 'openai' ? 'OpenAI 兼容' : 'Claude'),
    model: readStored(AI_MODEL_KEY, ''),
    baseUrl: readStored(AI_BASE_URL_KEY, ''),
    apiKey: readStored(AI_API_KEY, ''),
  };
}

export function saveAISettings(settings: AISettings): void {
  try {
    window.localStorage.setItem(AI_PROVIDER_KEY, settings.provider);
    window.localStorage.setItem(AI_PROVIDER_NAME_KEY, settings.providerName.trim());
    window.localStorage.setItem(AI_MODEL_KEY, settings.model.trim());
    window.localStorage.setItem(AI_BASE_URL_KEY, settings.baseUrl.trim());
    window.localStorage.setItem(AI_API_KEY, settings.apiKey.trim());
  } catch {
    // Settings are unavailable only in restricted storage contexts.
  }
}

function readProvider(): AIProviderType {
  return readStored(AI_PROVIDER_KEY, 'openai') === 'claude' ? 'claude' : 'openai';
}

function readStored(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
