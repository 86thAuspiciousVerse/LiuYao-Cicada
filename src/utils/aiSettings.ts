import type { AIProviderType } from '../ai';

const AI_PROVIDER_KEY = 'liuyao.ai.provider';
const AI_MODEL_KEY = 'liuyao.ai.model';
const LEGACY_AI_API_KEY = 'liuyao.ai.apiKey';
const LEGACY_AI_BASE_URL_KEY = 'liuyao.ai.baseUrl';

export interface AISettings {
  provider: AIProviderType;
  model: string;
}

export function readAISettings(): AISettings {
  clearLegacyClientSecrets();

  return {
    provider: readStored(AI_PROVIDER_KEY, 'openai') as AIProviderType,
    model: readStored(AI_MODEL_KEY, ''),
  };
}

export function saveAISettings(settings: AISettings): void {
  try {
    window.localStorage.setItem(AI_PROVIDER_KEY, settings.provider);
    window.localStorage.setItem(AI_MODEL_KEY, settings.model);
    clearLegacyClientSecrets();
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

function clearLegacyClientSecrets(): void {
  try {
    window.localStorage.removeItem(LEGACY_AI_API_KEY);
    window.localStorage.removeItem(LEGACY_AI_BASE_URL_KEY);
  } catch {
    // Ignore restricted storage contexts.
  }
}
