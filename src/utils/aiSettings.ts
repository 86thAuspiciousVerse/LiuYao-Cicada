import type { AIProviderType } from '../ai';

const AI_PROVIDER_KEY = 'liuyao.ai.provider';
const AI_API_KEY = 'liuyao.ai.apiKey';
const AI_MODEL_KEY = 'liuyao.ai.model';
const AI_BASE_URL_KEY = 'liuyao.ai.baseUrl';

export interface AISettings {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export function readAISettings(): AISettings {
  return {
    provider: readStored(AI_PROVIDER_KEY, 'openai') as AIProviderType,
    apiKey: readStored(AI_API_KEY, ''),
    model: readStored(AI_MODEL_KEY, ''),
    baseUrl: readStored(AI_BASE_URL_KEY, ''),
  };
}

export function saveAISettings(settings: AISettings): void {
  try {
    window.localStorage.setItem(AI_PROVIDER_KEY, settings.provider);
    window.localStorage.setItem(AI_API_KEY, settings.apiKey);
    window.localStorage.setItem(AI_MODEL_KEY, settings.model);
    window.localStorage.setItem(AI_BASE_URL_KEY, settings.baseUrl);
  } catch {
    // Settings are unavailable only in restricted storage contexts.
  }
}

function readStored(key: string, fallback: string): string {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
